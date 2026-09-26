import { Router } from 'express';
import { supabaseServer, isSupabaseConfigured } from '../supabase';
import { type AuthenticatedRequest, sanitizeForStaff } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/products
 * Fetch products with server-side pagination and optional filtering.
 * Query params:
 *   page     (default 1)
 *   limit    (default 100, max 500)
 *   search   (filters by name or code, case-insensitive)
 *   category (filter by category)
 *   archived (include archived: 'true'|'false', default false)
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(2000, Math.max(1, parseInt(req.query.limit as string) || 100));
  const offset = (page - 1) * limit;
  const search = (req.query.search as string || '').trim();
  const category = (req.query.category as string || '').trim();
  const includeArchived = req.query.archived === 'true';

  try {
    let query = supabaseServer
      .from('products')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (!includeArchived) query = query.eq('archived', false);
    if (category) query = query.eq('category', category);
    if (search) {
      // Supabase ilike for name or code
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    const products = (data || []).map(mapProduct);
    const sanitized = sanitizeForStaff(products, req.userRole);
    const total = count ?? 0;

    res.json({
      success: true,
      data: sanitized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * POST /api/products
 * Add a new product to inventory.
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId;
  const { code, name, category, quantity, costPrice, sellingPrice, alertLevel, supplier, supplierId, colorNotes, photo } = req.body;

  if (!shopId || !name) {
    return res.status(400).json({ success: false, error: 'Product name is required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  const validQty = Math.max(0, Number(quantity) || 0);
  const validCost = Math.max(0, Number(costPrice) || 0);
  const validSelling = Math.max(0, Number(sellingPrice) || 0);
  const validAlert = Math.max(1, Number(alertLevel) || 2);
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabaseServer
      .from('products')
      .insert({
        id: productId,
        shop_id: shopId,
        code: code ? code.trim() : `SKU-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        category: category || 'Saree',
        quantity: validQty,
        cost_price: validCost,
        selling_price: validSelling,
        alert_level: validAlert,
        supplier: supplier ? supplier.trim() : null,
        supplier_id: supplierId ? supplierId.trim() : null,
        color_notes: colorNotes ? colorNotes.trim() : null,
        photo: photo || null,
        archived: false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    // Record initial stock movement audit
    await supabaseServer.from('stock_movements').insert({
      id: `move_${Date.now()}`,
      shop_id: shopId,
      product_id: productId,
      product_name: name.trim(),
      type: 'purchase',
      quantity_change: validQty,
      previous_quantity: 0,
      new_quantity: validQty,
      reason: 'Initial stock intake',
      date: now,
    });

    const mapped = mapProduct(data);
    res.status(201).json({ success: true, data: sanitizeForStaff(mapped, req.userRole) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/products/:id
 * Update an existing product. Ensures tenant ownership.
 */
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId;
  const updates = req.body;

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.code !== undefined) updatePayload.code = updates.code.trim();
    if (updates.category !== undefined) updatePayload.category = updates.category;
    if (updates.quantity !== undefined) updatePayload.quantity = Math.max(0, Number(updates.quantity));
    if (updates.costPrice !== undefined) updatePayload.cost_price = Math.max(0, Number(updates.costPrice));
    if (updates.sellingPrice !== undefined) updatePayload.selling_price = Math.max(0, Number(updates.sellingPrice));
    if (updates.alertLevel !== undefined) updatePayload.alert_level = Math.max(1, Number(updates.alertLevel));
    if (updates.supplier !== undefined) updatePayload.supplier = updates.supplier;
    if (updates.supplierId !== undefined) updatePayload.supplier_id = updates.supplierId;
    if (updates.colorNotes !== undefined) updatePayload.color_notes = updates.colorNotes;
    if (updates.photo !== undefined) updatePayload.photo = updates.photo;

    const { data, error } = await supabaseServer
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Product not found in this store.' });

    res.json({ success: true, data: sanitizeForStaff(mapProduct(data), req.userRole) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * Archive (soft delete) a product. Owner only.
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId;

  if (req.userRole === 'staff') {
    return res.status(403).json({ success: false, error: 'Staff members are not permitted to delete products.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data, error } = await supabaseServer
      .from('products')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('shop_id', shopId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product archived successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/:id/adjust
 * Stock adjustment with movement log.
 */
router.post('/:id/adjust', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId;
  const { quantityChange, reason, type } = req.body;

  const change = Number(quantityChange);
  if (isNaN(change) || change === 0) {
    return res.status(400).json({ success: false, error: 'Valid non-zero quantityChange is required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data: prod, error: fetchError } = await supabaseServer
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (fetchError || !prod) {
      return res.status(404).json({ success: false, error: 'Product not found in this store.' });
    }

    const previousQuantity = prod.quantity;
    if (change < 0 && Math.abs(change) > previousQuantity) {
      return res.status(400).json({
        success: false,
        error: `Cannot reduce ${Math.abs(change)} pieces. Only ${previousQuantity} in stock.`,
      });
    }

    const newQuantity = previousQuantity + change;
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseServer
      .from('products')
      .update({ quantity: newQuantity, updated_at: now })
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record movement audit
    await supabaseServer.from('stock_movements').insert({
      id: `move_${Date.now()}`,
      shop_id: shopId,
      product_id: prod.id,
      product_name: prod.name,
      type: type || (change > 0 ? 'purchase' : 'adjustment'),
      quantity_change: change,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      reason: reason || 'Manual stock adjustment',
      date: now,
    });

    res.json({ success: true, data: sanitizeForStaff(mapProduct(updated), req.userRole) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products/bulk
 * Bulk import products with duplicate handling strategies and audit logging.
 */
router.post('/bulk', async (req: AuthenticatedRequest, res) => {
  const shopId = req.shopId || req.body?.shopId;
  const { products: incoming, duplicateStrategy = 'add' } = req.body;

  if (!shopId || !Array.isArray(incoming)) {
    return res.status(400).json({ success: false, error: 'Shop ID and products array are required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    const { data: existingProducts, error: fetchError } = await supabaseServer
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .eq('archived', false);

    if (fetchError) throw fetchError;

    // Pre-index existing products for fast and accurate lookup
    const existingByCode = new Map<string, any>();
    const existingByName = new Map<string, any>();
    const allKnownCodes = new Set<string>();

    for (const p of existingProducts || []) {
      if (p.code) {
        existingByCode.set(p.code.trim().toLowerCase(), p);
        allKnownCodes.add(p.code.trim().toUpperCase());
      }
      if (p.name) {
        existingByName.set(p.name.trim().toLowerCase(), p);
      }
    }

    let skuCounter = 1;
    const timestamp = Date.now().toString().slice(-4);
    function getNextUniqueCode(preferred?: string): string {
      if (preferred && preferred.trim()) {
        const cleaned = preferred.trim();
        if (!allKnownCodes.has(cleaned.toUpperCase())) {
          allKnownCodes.add(cleaned.toUpperCase());
          return cleaned;
        }
      }
      while (true) {
        const candidate = `SKU-${timestamp}-${skuCounter++}`;
        if (!allKnownCodes.has(candidate.toUpperCase())) {
          allKnownCodes.add(candidate.toUpperCase());
          return candidate;
        }
      }
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of incoming) {
      if (!item.name || !String(item.name).trim()) continue;

      const cleanName = String(item.name).trim();
      const rawCode = item.code ? String(item.code).trim() : '';

      // Match by code first, then by name
      let existing: any = null;
      if (rawCode) {
        existing = existingByCode.get(rawCode.toLowerCase());
      }
      if (!existing) {
        existing = existingByName.get(cleanName.toLowerCase());
      }

      const itemQty = Math.max(0, Math.round(Number(item.quantity) || 0));
      const itemCost = Math.max(0, Number(item.costPrice) || 0);
      const itemSelling = Math.max(0, Number(item.sellingPrice) || 0);
      const itemAlert = Math.max(1, Math.round(Number(item.alertLevel) || 2));
      const category = (item.category ? String(item.category).trim() : '') || 'Saree';
      const supplier = item.supplier ? String(item.supplier).trim() : null;
      const colorNotes = item.colorNotes ? String(item.colorNotes).trim() : null;
      
      const histSoldQty = Math.max(0, Number(item.historicalSoldQuantity) || 0);
      const histSoldPrice = Math.max(0, Number(item.historicalSoldPrice) || 0);

      let targetProductId = null;
      let targetProductCode = '';

      if (existing) {
        if (duplicateStrategy === 'skip') {
          skipped++;
        } else if (duplicateStrategy === 'overwrite') {
          const { error: updErr } = await supabaseServer
            .from('products')
            .update({
              quantity: itemQty,
              cost_price: itemCost,
              selling_price: itemSelling,
              category: category || existing.category,
              supplier: supplier ?? existing.supplier,
              color_notes: colorNotes ?? existing.color_notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (!updErr) {
            existing.quantity = itemQty;
            existing.cost_price = itemCost;
            existing.selling_price = itemSelling;
            updated++;
            targetProductId = existing.id;
            targetProductCode = existing.code;
          } else {
            console.error('[Bulk Import] Overwrite error for', existing.code, updErr);
          }
        } else if (duplicateStrategy === 'add') {
          const prevQty = Number(existing.quantity) || 0;
          const newQty = prevQty + itemQty;

          const { error: updErr } = await supabaseServer
            .from('products')
            .update({
              quantity: newQty,
              ...(itemCost > 0 ? { cost_price: itemCost } : {}),
              ...(itemSelling > 0 ? { selling_price: itemSelling } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (!updErr) {
            existing.quantity = newQty;
            updated++;

            // Audit movement logging
            if (itemQty > 0) {
              await supabaseServer.from('stock_movements').insert({
                id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                shop_id: shopId,
                product_id: existing.id,
                product_name: existing.name,
                type: 'purchase',
                quantity_change: itemQty,
                previous_quantity: prevQty,
                new_quantity: newQty,
                reason: 'Bulk spreadsheet stock addition (+Qty)',
                date: new Date().toISOString(),
              });
            }
            targetProductId = existing.id;
            targetProductCode = existing.code;
          } else {
            console.error('[Bulk Import] Add Qty error for', existing.code, updErr);
          }
        }
      } else {
        const finalCode = getNextUniqueCode(rawCode);
        const newId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const newProd = {
          id: newId,
          shop_id: shopId,
          code: finalCode,
          name: cleanName,
          category,
          quantity: itemQty,
          cost_price: itemCost,
          selling_price: itemSelling,
          alert_level: itemAlert,
          supplier,
          color_notes: colorNotes,
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: insErr } = await supabaseServer.from('products').insert(newProd);

        if (!insErr) {
          existingByCode.set(finalCode.toLowerCase(), newProd);
          existingByName.set(newProd.name.toLowerCase(), newProd);
          added++;

          // Audit movement logging
          if (itemQty > 0) {
            await supabaseServer.from('stock_movements').insert({
              id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              shop_id: shopId,
              product_id: newId,
              product_name: cleanName,
              type: 'purchase',
              quantity_change: itemQty,
              previous_quantity: 0,
              new_quantity: itemQty,
              reason: 'Initial stock from bulk Excel import',
              date: new Date().toISOString(),
            });
          }
          targetProductId = newId;
          targetProductCode = finalCode;
        } else {
          console.error('[Bulk Import] Insert error for', finalCode, insErr);
        }
      }

      if (targetProductId && histSoldQty > 0) {
        // Create historical bill to record profit
        const billId = `bill_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const billTotal = histSoldQty * histSoldPrice;
        const billCost = histSoldQty * itemCost;
        const billProfit = billTotal - billCost;
        
        await supabaseServer.from('bills').insert({
          id: billId,
          shop_id: shopId,
          bill_no: `HIST-${timestamp}-${skuCounter}`,
          date: new Date().toISOString(),
          customer_name: 'Historical Import',
          items: [{
            id: `item_hist_${Date.now()}`,
            billId: billId,
            productId: targetProductId,
            productCode: targetProductCode,
            productName: cleanName,
            quantity: histSoldQty,
            listedPrice: itemSelling || histSoldPrice,
            soldPrice: histSoldPrice,
            costPriceAtSale: itemCost,
            profit: billProfit
          }],
          subtotal: billTotal,
          discount: 0,
          total: billTotal,
          total_cost: billCost,
          total_profit: billProfit,
          payment_mode: 'Cash',
          amount_paid: billTotal,
          status: 'completed',
          created_at: new Date().toISOString(),
          created_by: 'owner'
        });

        // Record stock movement for historical sale to keep audit intact
        await supabaseServer.from('stock_movements').insert({
          id: `mov_hist_sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          shop_id: shopId,
          product_id: targetProductId,
          product_name: cleanName,
          type: 'sale',
          quantity_change: -histSoldQty,
          previous_quantity: itemQty + histSoldQty,
          new_quantity: itemQty,
          reason: 'Historical sale from Excel import',
          date: new Date().toISOString(),
        });
      }
    }

    res.json({ success: true, data: { added, updated, skipped } });
  } catch (err: any) {
    console.error('[Bulk Import Route Exception]', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error during bulk import' });
  }
});

/**
 * POST /api/products/:id/photo
 * Upload or attach a photo to a product.
 * Supports Supabase Storage with graceful fallback to data URL.
 */
router.post('/:id/photo', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const shopId = req.shopId;
  const { photo } = req.body;

  if (!shopId) {
    return res.status(400).json({ success: false, error: 'Target shop not resolved.' });
  }

  if (!photo) {
    return res.status(400).json({ success: false, error: 'Photo data or URL is required.' });
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).json({ success: false, error: 'Database service unavailable.' });
  }

  try {
    let finalPhotoUrl = photo;

    // If it's a base64 data URL, attempt upload to Supabase Storage
    if (typeof photo === 'string' && photo.startsWith('data:image/')) {
      try {
        const matches = photo.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const filePath = `${shopId}/${id}.${ext}`;

          const { error: uploadError } = await supabaseServer.storage
            .from('product-images')
            .upload(filePath, buffer, {
              contentType: `image/${matches[1]}`,
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabaseServer.storage
              .from('product-images')
              .getPublicUrl(filePath);

            if (publicUrlData?.publicUrl) {
              finalPhotoUrl = publicUrlData.publicUrl;
            }
          } else {
            console.warn('[Storage] Upload failed, falling back to direct photo string:', uploadError.message);
          }
        }
      } catch (storageErr) {
        console.warn('[Storage] Exception uploading to Supabase Storage, using fallback:', storageErr);
      }
    }

    const { data, error } = await supabaseServer
      .from('products')
      .update({
        photo: finalPhotoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Product not found.' });

    res.json({ success: true, data: sanitizeForStaff(mapProduct(data), req.userRole) });
  } catch (err: any) {
    console.error('[Products/:id/photo]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function mapProduct(p: any) {
  return {
    id: p.id,
    shopId: p.shop_id,
    code: p.code,
    name: p.name,
    category: p.category,
    quantity: p.quantity,
    costPrice: Number(p.cost_price),
    sellingPrice: Number(p.selling_price),
    alertLevel: p.alert_level,
    supplier: p.supplier,
    supplierId: p.supplier_id,
    colorNotes: p.color_notes,
    photo: p.photo,
    archived: p.archived,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export default router;
