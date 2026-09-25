-- ==============================================================================
-- Tela: Supabase PostgreSQL Database Schema & Atomic Billing Engine
-- Production Hardened: RLS Enabled, Data Integrity Constraints, ACID Billing
-- Run this entire script in your Supabase SQL Editor (supabase.com/dashboard)
-- ==============================================================================

-- 1. Shops Table
CREATE TABLE IF NOT EXISTS public.shops (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  business_type TEXT NOT NULL DEFAULT 'Saree',
  language TEXT NOT NULL DEFAULT 'en',
  pin TEXT,
  address TEXT,
  last_bill_seq INT NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrations for existing shops
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS last_bill_seq INT NOT NULL DEFAULT 1000;
CREATE INDEX IF NOT EXISTS idx_shops_user_id ON public.shops(user_id);
CREATE INDEX IF NOT EXISTS idx_shops_phone ON public.shops(phone);

-- 2. Products Table (Inventory)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Saree',
  quantity INT NOT NULL DEFAULT 0,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  alert_level INT NOT NULL DEFAULT 2,
  supplier TEXT,
  color_notes TEXT,
  photo TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_products_quantity CHECK (quantity >= 0),
  CONSTRAINT chk_products_cost CHECK (cost_price >= 0),
  CONSTRAINT chk_products_selling CHECK (selling_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- Unique SKU code per shop
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_products_shop_code'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT uq_products_shop_code UNIQUE (shop_id, code);
  END IF;
END $$;

-- 3. Stock Movements (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- preserved even if product is deleted
  product_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', 'return'
  quantity_change INT NOT NULL,
  previous_quantity INT NOT NULL,
  new_quantity INT NOT NULL,
  reason TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_shop_id ON public.stock_movements(shop_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements(date);

-- 4. Bills Table (Counter Sales)
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'Cash', -- 'Cash', 'UPI', 'Card', 'Credit', 'Part'
  amount_paid NUMERIC(12, 2),
  balance_due NUMERIC(12, 2),
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'cancelled', 'returned'
  created_by TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2);
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_bills_shop_id ON public.bills(shop_id);
CREATE INDEX IF NOT EXISTS idx_bills_date ON public.bills(date);

-- 5. Customers Table (Udhaar Khata)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_purchase_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- 6. Customer Transactions (Complete Udhaar Ledger Audit History)
CREATE TABLE IF NOT EXISTS public.customer_transactions (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bill_id TEXT REFERENCES public.bills(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'credit_sale', 'payment', 'adjustment', 'return_credit'
  amount NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  notes TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_tx_shop ON public.customer_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_tx_cust ON public.customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tx_date ON public.customer_transactions(date);

-- 7. Goals Table (Monthly Targets)
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM
  profit_target NUMERIC(12, 2) NOT NULL DEFAULT 50000,
  sales_target NUMERIC(12, 2) NOT NULL DEFAULT 150000,
  pieces_target INT NOT NULL DEFAULT 50,
  UNIQUE(shop_id, month)
);

CREATE INDEX IF NOT EXISTS idx_goals_shop_month ON public.goals(shop_id, month);

-- 8. Admin Configuration Table (Master Switch & Whitelist)
CREATE TABLE IF NOT EXISTS public.admin_config (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  global_subscription_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  trial_action_limit INT NOT NULL DEFAULT 25,
  whitelisted_users JSONB NOT NULL DEFAULT '[]'::jsonb,
  platform_notice TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default admin config if missing
INSERT INTO public.admin_config (id, global_subscription_enabled, trial_action_limit, whitelisted_users)
VALUES ('global_config', FALSE, 25, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 9. Licenses Table (Server-Side License & Action Gating)
CREATE TABLE IF NOT EXISTS public.licenses (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id TEXT,
  license_type TEXT NOT NULL DEFAULT 'trial', -- 'trial', 'lifetime', 'vip'
  action_count INT NOT NULL DEFAULT 0,
  max_trial_actions INT NOT NULL DEFAULT 25,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_shop_id ON public.licenses(shop_id);

-- 10. Suppliers Table (Vendor / Supplier Ledger)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_shop_id ON public.suppliers(shop_id);

-- 11. Purchase Orders Table (Restocking from Suppliers)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_po_quantity CHECK (quantity > 0),
  CONSTRAINT chk_po_unit_cost CHECK (unit_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_shop_id ON public.purchase_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON public.purchase_orders(date);

-- Migration: Add supplier_id FK to products (replaces old free-text supplier field)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL;
-- Clear old free-text supplier values (user chose to discard)
UPDATE public.products SET supplier = NULL WHERE supplier IS NOT NULL;

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) - Protects Database Against Anon Direct Access
-- ==============================================================================
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Note: The Express backend connects with SUPABASE_SERVICE_ROLE_KEY, which
-- automatically bypasses RLS. Enabling RLS blocks unauthorized frontend direct
-- access using VITE_SUPABASE_ANON_KEY.

-- ==============================================================================
-- 11. Atomic Counter Billing Stored Procedure
-- - Exclusive row locks (FOR UPDATE)
-- - Rejects overselling with descriptive exceptions
-- - Server-side cost & profit computation
-- - Collision-free sequential bill numbering
-- - Part payment and Udhaar transaction recording
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.atomic_create_bill(
  p_shop_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_items JSONB,
  p_discount NUMERIC,
  p_payment_mode TEXT,
  p_amount_paid NUMERIC,
  p_created_by TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_prod RECORD;
  v_new_qty INT;
  v_bill_id TEXT;
  v_bill_no TEXT;
  v_seq INT;
  v_now TIMESTAMPTZ := NOW();
  v_subtotal NUMERIC := 0;
  v_total_cost NUMERIC := 0;
  v_total NUMERIC := 0;
  v_total_profit NUMERIC := 0;
  v_credit_amount NUMERIC := 0;
  v_paid NUMERIC := 0;
  v_cust_id TEXT;
  v_cust_curr_balance NUMERIC := 0;
  v_cust_new_balance NUMERIC := 0;
  v_processed_items JSONB := '[]'::jsonb;
BEGIN
  -- 1. Collision-Free Sequential Bill Numbering
  UPDATE public.shops
  SET last_bill_seq = COALESCE(last_bill_seq, 1000) + 1
  WHERE id = p_shop_id
  RETURNING last_bill_seq INTO v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Shop with ID % does not exist', p_shop_id;
  END IF;

  v_bill_no := 'BILL-' || v_seq;
  v_bill_id := 'bill_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 4);

  -- 2. Validate items and verify sufficient stock with FOR UPDATE row-level locks
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (
    "productId" TEXT,
    "productCode" TEXT,
    "productName" TEXT,
    "quantity" INT,
    "soldPrice" NUMERIC,
    "listedPrice" NUMERIC
  ) LOOP
    SELECT id, code, name, quantity, cost_price, selling_price INTO v_prod
    FROM public.products
    WHERE id = v_item."productId" AND shop_id = p_shop_id
    FOR UPDATE;

    IF v_prod IS NULL THEN
      RAISE EXCEPTION 'Product % does not exist in store inventory', v_item."productId";
    END IF;

    -- Strict overselling prevention
    IF v_prod.quantity < v_item."quantity" THEN
      RAISE EXCEPTION 'Insufficient stock for "%" (Available: % pcs, Requested: % pcs)',
        v_prod.name, v_prod.quantity, v_item."quantity";
    END IF;

    v_new_qty := v_prod.quantity - v_item."quantity";

    -- Deduct stock
    UPDATE public.products
    SET quantity = v_new_qty, updated_at = v_now
    WHERE id = v_prod.id;

    -- Record stock movement audit
    INSERT INTO public.stock_movements (
      id, shop_id, product_id, product_name, type, quantity_change, previous_quantity, new_quantity, reason, date
    ) VALUES (
      'move_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 4),
      p_shop_id,
      v_prod.id,
      v_prod.name,
      'sale',
      -v_item."quantity",
      v_prod.quantity,
      v_new_qty,
      'Sale ' || v_bill_no,
      v_now
    );

    -- Server-side line calculations
    DECLARE
      v_item_sold NUMERIC := COALESCE(v_item."soldPrice", v_prod.selling_price);
      v_item_cost NUMERIC := v_prod.cost_price;
      v_item_profit NUMERIC := (v_item_sold - v_item_cost) * v_item."quantity";
      v_item_record JSONB;
    BEGIN
      v_subtotal := v_subtotal + (v_item_sold * v_item."quantity");
      v_total_cost := v_total_cost + (v_item_cost * v_item."quantity");

      v_item_record := jsonb_build_object(
        'id', 'item_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
        'billId', v_bill_id,
        'productId', v_prod.id,
        'productCode', v_prod.code,
        'productName', v_prod.name,
        'quantity', v_item."quantity",
        'listedPrice', COALESCE(v_item."listedPrice", v_prod.selling_price),
        'soldPrice', v_item_sold,
        'costPriceAtSale', v_item_cost,
        'profit', v_item_profit
      );
      v_processed_items := v_processed_items || jsonb_build_array(v_item_record);
    END;
  END LOOP;

  -- 3. Bill-Level Totals Calculation
  v_total := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));
  v_total_profit := v_total - v_total_cost;

  -- 4. Calculate Credit and Part Payment Amounts
  IF p_payment_mode = 'Credit' THEN
    v_credit_amount := v_total;
    v_paid := 0;
  ELSIF p_payment_mode = 'Part' THEN
    v_paid := LEAST(v_total, GREATEST(0, COALESCE(p_amount_paid, 0)));
    v_credit_amount := v_total - v_paid;
  ELSE
    v_credit_amount := 0;
    v_paid := v_total;
  END IF;

  -- 5. Record Completed Bill
  INSERT INTO public.bills (
    id, shop_id, bill_no, date, customer_name, customer_phone, items,
    subtotal, discount, total, total_cost, total_profit, payment_mode,
    amount_paid, balance_due, status, created_by, created_at
  ) VALUES (
    v_bill_id, p_shop_id, v_bill_no, v_now, p_customer_name, p_customer_phone, v_processed_items,
    v_subtotal, COALESCE(p_discount, 0), v_total, v_total_cost, v_total_profit, p_payment_mode,
    v_paid, v_credit_amount, 'completed', p_created_by, v_now
  );

  -- 6. Update Customer Ledger & Post Transaction History
  IF p_customer_phone IS NOT NULL AND TRIM(p_customer_phone) <> '' THEN
    SELECT id, balance_due INTO v_cust_id, v_cust_curr_balance
    FROM public.customers
    WHERE shop_id = p_shop_id AND phone = TRIM(p_customer_phone)
    FOR UPDATE;

    IF v_cust_id IS NULL THEN
      v_cust_id := 'cust_' || EXTRACT(EPOCH FROM v_now)::BIGINT;
      v_cust_curr_balance := 0;
      v_cust_new_balance := v_credit_amount;

      INSERT INTO public.customers (id, shop_id, name, phone, balance_due, total_spent, last_purchase_date)
      VALUES (
        v_cust_id,
        p_shop_id,
        COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Walk-in Customer'),
        TRIM(p_customer_phone),
        v_cust_new_balance,
        v_total,
        v_now
      );
    ELSE
      v_cust_new_balance := v_cust_curr_balance + v_credit_amount;

      UPDATE public.customers
      SET
        total_spent = total_spent + v_total,
        balance_due = v_cust_new_balance,
        last_purchase_date = v_now,
        name = COALESCE(NULLIF(TRIM(p_customer_name), ''), name)
      WHERE id = v_cust_id;
    END IF;

    -- Record audit transaction in customer_transactions ledger
    IF v_credit_amount > 0 THEN
      INSERT INTO public.customer_transactions (
        id, shop_id, customer_id, bill_id, type, amount, balance_after, notes, date
      ) VALUES (
        'tx_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 4),
        p_shop_id,
        v_cust_id,
        v_bill_id,
        'credit_sale',
        v_credit_amount,
        v_cust_new_balance,
        'Credit from ' || v_bill_no || ' (' || p_payment_mode || ')',
        v_now
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_bill_id,
    'billNo', v_bill_no,
    'total', v_total,
    'subtotal', v_subtotal,
    'discount', COALESCE(p_discount, 0),
    'totalCost', v_total_cost,
    'totalProfit', v_total_profit,
    'paymentMode', p_payment_mode,
    'amountPaid', v_paid,
    'balanceDue', v_credit_amount,
    'createdAt', v_now
  );
END;
$$;

-- Revoke public permissions on the stored procedure
-- Full argument list is required to disambiguate overloaded versions
REVOKE EXECUTE ON FUNCTION public.atomic_create_bill(TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atomic_create_bill(TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, NUMERIC, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atomic_create_bill(TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, NUMERIC, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_create_bill(TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, NUMERIC, TEXT) TO service_role;
