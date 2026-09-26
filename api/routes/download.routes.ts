import { Router } from 'express';
import * as XLSX from 'xlsx';
import { supabaseServer, isSupabaseConfigured } from '../supabase';

const router = Router();

function createTemplateWorkbook(): XLSX.WorkBook {
  const templateRows = [
    {
      'Product Code': 'HL-101',
      'Product Name': 'Handloom Cotton Saree, Royal Blue',
      'Category': 'Handloom',
      'Quantity': 10,
      'Cost Price': 1800,
      'Selling Price': 2500,
      'Supplier': 'Dharmavaram Society',
      'Low Stock Alert': 3,
      'Color / Notes': 'Peacock blue with zari pallu',
    },
    {
      'Product Code': 'KC-201',
      'Product Name': 'Kanchipuram Pure Silk, Crimson',
      'Category': 'Silk',
      'Quantity': 5,
      'Cost Price': 4500,
      'Selling Price': 6200,
      'Supplier': 'Kanchi Weavers',
      'Low Stock Alert': 2,
      'Color / Notes': 'Bridal red pure silk with contrast border',
    },
    {
      'Product Code': 'BN-301',
      'Product Name': 'Banarasi Brocade, Emerald Green',
      'Category': 'Banarasi',
      'Quantity': 8,
      'Cost Price': 3200,
      'Selling Price': 4600,
      'Supplier': 'Varanasi Direct',
      'Low Stock Alert': 2,
      'Color / Notes': 'Gold floral jaal with rich border',
    },
    {
      'Product Code': 'CH-401',
      'Product Name': 'Chanderi Silk Cotton Saree, Mustard Yellow',
      'Category': 'Chanderi',
      'Quantity': 12,
      'Cost Price': 1400,
      'Selling Price': 2100,
      'Supplier': 'Chanderi Craft Guild',
      'Low Stock Alert': 3,
      'Color / Notes': 'Mustard yellow with silver booti work',
    },
    {
      'Product Code': 'GT-501',
      'Product Name': 'Pure Georgette Printed Saree, Pastel Pink',
      'Category': 'Georgette',
      'Quantity': 15,
      'Cost Price': 950,
      'Selling Price': 1550,
      'Supplier': 'Surat Mills Co',
      'Low Stock Alert': 4,
      'Color / Notes': 'Floral digital print lightweight saree',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 42 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
    { wch: 38 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock_Template');
  return workbook;
}

/**
 * GET /api/downloads/template
 * Native HTTP file download for Excel Template.
 * Saves directly to ~/Downloads with 0 client-side blob URL issues.
 */
router.get('/template', (_req, res) => {
  try {
    const workbook = createTemplateWorkbook();
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Tela_Saree_Stock_Template.xlsx"');
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating template download:', err);
    res.status(500).send('Failed to generate template');
  }
});

function createHistoricalTemplateWorkbook(): XLSX.WorkBook {
  const templateRows = [
    {
      'Item Name': 'Legacy Cotton Saree 2023',
      'Quantity': 50,
      'Cost Price': 800,
      'Selling Price': 1200,
      'Date Sold': '2023-05-12'
    },
    {
      'Item Name': 'Bridal Silk Saree 2024',
      'Quantity': 5,
      'Cost Price': 4500,
      'Selling Price': 7000,
      'Date Sold': '2024-01-20'
    },
    {
      'Item Name': 'Summer Printed Georgette',
      'Quantity': 120,
      'Cost Price': 450,
      'Selling Price': 800,
      'Date Sold': '2024-03-15'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  worksheet['!cols'] = [
    { wch: 35 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Historical_Template');
  return workbook;
}

/**
 * GET /api/downloads/historical-template
 * Native HTTP file download for Historical Excel Template.
 */
router.get('/historical-template', (_req, res) => {
  try {
    const workbook = createHistoricalTemplateWorkbook();
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Historical_Data_Template.xlsx"');
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating historical template download:', err);
    res.status(500).send('Failed to generate template');
  }
});

/**
 * GET /api/downloads/template-csv
 * Native HTTP file download for CSV Template.
 */
router.get('/template-csv', (_req, res) => {
  try {
    const csvContent =
      '\uFEFF' +
      'Product Code,Product Name,Category,Quantity,Cost Price,Selling Price,Supplier,Low Stock Alert,Color / Notes\n' +
      'HL-101,"Handloom Cotton Saree, Royal Blue",Handloom,10,1800,2500,"Dharmavaram Society",3,"Peacock blue with zari pallu"\n' +
      'KC-201,"Kanchipuram Pure Silk, Crimson",Silk,5,4500,6200,"Kanchi Weavers",2,"Bridal red pure silk with contrast border"\n' +
      'BN-301,"Banarasi Brocade, Emerald Green",Banarasi,8,3200,4600,"Varanasi Direct",2,"Gold floral jaal with rich border"\n' +
      'CH-401,"Chanderi Silk Cotton Saree, Mustard Yellow",Chanderi,12,1400,2100,"Chanderi Craft Guild",3,"Mustard yellow with silver booti work"\n' +
      'GT-501,"Pure Georgette Printed Saree, Pastel Pink",Georgette,15,950,1550,"Surat Mills Co",4,"Floral digital print lightweight saree"';

    const buffer = Buffer.from(csvContent, 'utf-8');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Tela_Saree_Stock_Template.csv"');
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating CSV template download:', err);
    res.status(500).send('Failed to generate CSV template');
  }
});

/**
 * GET /api/downloads/stock-excel?shopId=...
 * Native HTTP file download for Shop Inventory Export.
 */
router.get('/stock-excel', async (req, res) => {
  const shopId = (req.query.shopId as string) || '';
  if (!shopId) {
    return res.status(400).send('shopId parameter is required.');
  }

  if (!isSupabaseConfigured() || !supabaseServer) {
    return res.status(503).send('Database service unavailable.');
  }

  try {
    // 1. Fetch shop info
    const { data: shop } = await supabaseServer.from('shops').select('name').eq('id', shopId).single();
    const shopName = shop?.name || 'Tela';
    const cleanShopName = shopName.replace(/[^a-zA-Z0-9]/g, '_');

    // 2. Fetch active products
    const { data: products, error } = await supabaseServer
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const exportData = (products || []).map((p: any) => {
      const cost = Number(p.cost_price) || 0;
      const sell = Number(p.selling_price) || 0;
      const qty = Number(p.quantity) || 0;
      const profit = sell - cost;
      const margin = sell > 0 ? Math.round((profit / sell) * 100) : 0;

      return {
        'Product Code': p.code || '',
        'Product Name': p.name || '',
        'Category': p.category || 'Saree',
        'Quantity': qty,
        'Cost Price (₹)': cost,
        'Selling Price (₹)': sell,
        'Expected Profit (₹)': profit,
        'Margin %': margin,
        'Total Stock Cost (₹)': qty * cost,
        'Total Stock Retail (₹)': qty * sell,
        'Low Stock Alert Level': p.alert_level || 2,
        'Supplier': p.supplier || '',
        'Color / Notes': p.color_notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 38 },
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 15 },
      { wch: 18 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock_Inventory');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const dateStr = new Date().toISOString().substring(0, 10);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanShopName}_Stock_${dateStr}.xlsx"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err: any) {
    console.error('Error exporting stock excel:', err);
    res.status(500).send('Failed to export inventory');
  }
});

export default router;
