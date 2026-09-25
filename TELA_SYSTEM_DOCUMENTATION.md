# Tela (टेला) — Complete Technical & Product Specification

> **Document Purpose**: Comprehensive, zero-hallucination context document detailing the complete architecture, features, database schema, API contracts, security layer, frontend components, and business logic of the Tela application.

---

## 1. Product Identity & Core Purpose

- **App Name**: Tela (टेला)
- **Tagline**: Simple, Offline-First Stock, Billing & Profit Counter for Indian Retailers
- **Target Audience**: Indian saree shop owners, garment retailers, cloth merchants, boutique operators, and counter sales staff.
- **Problem Solved**:
  1. Indian garment retail involves constant customer bargaining. Shopkeepers often negotiate without knowing their real-time cost price or net margin, leading to unintentional loss-making sales.
  2. Inventory is locked in slow-moving sarees ("dead stock") without visibility into how much capital is trapped.
  3. Customer credit ("Udhaar") is maintained in manual paper notebooks (Khata), resulting in forgotten receivables and awkward debt collection.
  4. Traditional POS software is bloated, cloud-dependent, English-only, and complex for non-technical counter staff.
- **Design Philosophy**:
  - **Strict High-Contrast Black & White Utilitarian Theme**: Pure `#FFFFFF` and `#000000`, zero distracting colors, sharp borders (`1.5px solid #000`), zero rounded bloat (`border-radius: 0`).
  - **Typography**: Google Fonts `Inter` (UI/text) and `JetBrains Mono` (numbers, SKUs, currency amounts, tabular data).
  - **Privacy-First Counter Design**: Separate **Owner** and **Counter Staff** roles. Counter staff can bill and search items, but cost prices, net margins, and working capital valuations are masked (`••••••••`).

---

## 2. Technology Stack & Directory Structure

### 2.1 Technology Stack

| Layer | Technology | Version / Details |
|---|---|---|
| **Frontend Framework** | React + TypeScript | React `^19.2.8`, TypeScript `~6.0.2` |
| **Bundler & Dev Server** | Vite | Vite `^8.3.0`, `@vitejs/plugin-react` `^6.1.1` |
| **Icons** | Lucide React | `^1.47.0` |
| **Spreadsheet Engine** | SheetJS (xlsx) | `^0.18.5` (Excel `.xlsx` and `.csv` reading/writing) |
| **Local Offline DB** | Dexie.js (IndexedDB) | `^4.4.6` (Resilient client-side offline storage) |
| **Backend Runtime** | Node.js + Express | Express `^5.2.1`, tsx `^4.23.15` (TypeScript execution) |
| **Database & Auth** | Supabase (PostgreSQL) | `@supabase/supabase-js` `^2.116.0` (Hosted PostgreSQL + Auth) |
| **Linter** | Oxlint | `^1.81.0` |
| **Process Manager** | Concurrently | `^10.0.5` (Runs frontend + backend simultaneously) |

### 2.2 Complete Project Structure

```
Stocks Saree App/
├── .env                              # Active environment configuration
├── .env.example                      # Template environment variables
├── .gitignore                        # Git exclusion rules
├── .oxlintrc.json                    # Oxlint linter settings
├── package.json                      # Workspace dependencies and scripts
├── tsconfig.json                     # Root TypeScript configuration
├── tsconfig.app.json                 # Frontend TypeScript compiler options
├── tsconfig.node.json                # Node/Vite tooling TypeScript configuration
├── vite.config.ts                    # Vite config (proxies /api to Express at port 5001)
├── api/                              # Central API routes, client, and middleware
│   ├── client/
│   │   └── client.ts                 # Type-safe frontend fetch client with Bearer JWT injection
│   ├── middleware/
│   │   └── auth.middleware.ts        # Express requireAuth middleware validating Supabase JWT
│   ├── routes/
│   │   ├── admin.routes.ts           # Global config, whitelist, fleet monitoring, wipe
│   │   ├── auth.routes.ts            # Admin user creation, linked shop lookup, fleet shops
│   │   ├── bills.routes.ts           # Counter sales, atomic stock reduction RPC
│   │   ├── customers.routes.ts       # Udhaar Khata, payment and credit ledger, pagination
│   │   ├── goals.routes.ts           # Monthly profit targets and pace tracking
│   │   ├── index.ts                  # Central Express router mounting all route modules
│   │   ├── products.routes.ts        # Inventory CRUD, stock adjustments, bulk imports, photos
│   │   ├── purchases.routes.ts       # Inward purchase orders, restocking stock intake, payables
│   │   ├── reports.routes.ts         # Monthly closing, COGS, dead stock, restock suggestions, goal history
│   │   └── suppliers.routes.ts       # Vendor/weaver ledger, purchases & payables aggregation
│   ├── supabase.ts                   # Server-side Supabase client (service role bypass)
│   └── types/
│       └── index.ts                  # Shared domain interfaces and API contract types
├── backend/                          # Backend Express server entry & data fallbacks
│   ├── data/
│   │   └── tela_db.json       # Resilient local JSON disk cache (empty by default)
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts              # Local JSON mutex-locked transaction engine
│   │   │   ├── schema.sql            # Master PostgreSQL schema & PL/pgSQL stored procedures
│   │   │   └── supabaseAdapter.ts    # Bi-directional sync between Supabase & local cache
│   │   └── server.ts                 # Express HTTP server listening on port 5001
│   └── tsconfig.json                 # Backend TypeScript compiler configuration
└── frontend/                         # Vite React Single Page Application (SPA)
    ├── index.html                    # HTML entry point (Meta tags, Google Fonts)
    └── src/
        ├── App.css                   # Layout helper classes
        ├── App.tsx                   # Root React component, route router, state manager
        ├── index.css                 # Strict Black & White design system and tokens
        ├── main.tsx                  # React DOM root render
        ├── components/
        │   ├── admin/
        │   │   └── AdminDashboard.tsx      # Master portal (/#admin): whitelist, toggle, fleet
        │   ├── auth/
        │   │   └── AuthScreen.tsx          # Sign In, Create Store, Forgot Password tabs
        │   ├── billing/
        │   │   ├── BillingView.tsx         # Quick Billing POS counter, live bargaining calculator
        │   │   └── BillReceiptModal.tsx    # Printable bill & WhatsApp sharing modal
        │   ├── common/
        │   │   ├── BWModal.tsx             # Universal B&W high-contrast modal dialog
        │   │   └── BWStatCard.tsx          # Universal metric summary card
        │   ├── customers/
        │   │   └── CustomersView.tsx       # Udhaar Khata ledger, server pagination & WhatsApp reminders
        │   ├── dashboard/
        │   │   └── DashboardView.tsx       # Counter activity, stock valuations, goal progress
        │   ├── goals/
        │   │   └── GoalsView.tsx           # Monthly profit goal, 12-month performance history log
        │   ├── layout/
        │   │   └── Navbar.tsx              # Tab switcher (incl. Suppliers), store badge, role switcher
        │   ├── products/
        │   │   ├── ExcelUploadModal.tsx    # 4-step Excel/CSV import modal with column mapping
        │   │   ├── ProductList.tsx         # Inventory table, photo thumbnails, search, filters
        │   │   ├── ProductModal.tsx        # Add / Edit Saree dialog, supplier dropdown, photo upload
        │   │   └── StockAdjustModal.tsx    # Stock audit adjustment modal (11 reasons)
        │   ├── reports/
        │   │   └── ReportsView.tsx         # Monthly P&L, COGS, Dead Stock, restock warnings
        │   ├── subscription/
        │   │   └── PaywallModal.tsx        # ₹499 lifetime paywall & VIP promo code bypass
        │   └── suppliers/
        │       └── SuppliersView.tsx       # Weavers directory, purchase orders & payables ledger
        ├── db/
        │   └── index.ts              # Client-side Dexie.js (IndexedDB) database
        ├── types/
        │   └── index.ts              # Frontend re-export of API domain types
        └── utils/
            ├── excel.ts              # SheetJS import/export/validation utilities
            └── supabase.ts           # Frontend Supabase auth client & phone-to-email mapping
```

---

## 3. Security, Authentication & Session Model

### 3.1 Dual-Layer Authentication Flow

1. **User Identity Normalization**:
   - Indian shopkeepers commonly register using a 10-digit mobile phone number instead of an email.
   - The helper function `phoneToEmail(phone)` transforms 10-digit phone numbers (`9876543210`) into deterministic synthetic emails: `9876543210@tela.app`.
   - International/country-coded numbers (`919876543210`) are normalized to remove the country prefix.
   - Standard email addresses are preserved as-is.

2. **Store Registration Flow (`POST /api/auth/register`)**:
   - The client submits `email` (or phone), `password`, `shopName`, `ownerName`, `phone`, `businessType`, `language`, and `address`.
   - The backend uses `supabaseServer.auth.admin.createUser()` with `email_confirm: true` to auto-confirm the user, avoiding email confirmation bottlenecks for non-technical users.
   - Creates a new record in `public.shops` tied to the created `user_id`.
   - Automatically seeds an initial monthly profit goal in `public.goals` (default targets: ₹50,000 profit, ₹150,000 sales, 50 pieces).

3. **Sign In & Token Acquisition**:
   - Executed via the frontend Supabase JS client (`supabase.auth.signInWithPassword()`).
   - Returns a Supabase Auth Session containing an encrypted JWT `access_token`.
   - The session is stored by the client in localStorage (`persistSession: true`).
   - Auth state changes across tabs are monitored via `supabase.auth.onAuthStateChange()`.

4. **Forgot Password Flow**:
   - Triggers `supabase.auth.resetPasswordForEmail()` directing the user back to the application origin with reset instructions.

### 3.2 Server-Side JWT Verification Middleware

- Implemented in [api/middleware/auth.middleware.ts](file:///Users/srinjoyroy/Documents/Stocks%20Saree%20App/api/middleware/auth.middleware.ts).
- Protects all functional API route branches:
  ```typescript
  apiRouter.use('/products', requireAuth, productRoutes);
  apiRouter.use('/bills', requireAuth, billRoutes);
  apiRouter.use('/customers', requireAuth, customerRoutes);
  apiRouter.use('/goals', requireAuth, goalRoutes);
  apiRouter.use('/reports', requireAuth, reportRoutes);
  apiRouter.use('/admin', requireAuth, adminRoutes);
  ```
- **Verification Logic**:
  1. Inspects the incoming `Authorization` HTTP header for format `Bearer <token>`.
  2. Invokes `supabaseServer.auth.getUser(token)`.
  3. Rejects invalid or expired tokens with `401 Unauthorized`.
  4. Injects `req.user` into the request object and calls `next()`.

### 3.3 Role-Based Access Control (RBAC)

The app supports two operational roles:
- **`owner`**:
  - Full access to product cost prices (`costPrice`).
  - Full visibility into working capital invested (`Stock Value at Cost`).
  - Full visibility into net profit margins per bill, per product, and monthly P&L summaries.
  - Ability to delete/archive products.
- **`staff`**:
  - Designed for counter attendants and billing helpers.
  - Cost prices are masked with `••••••••`.
  - Profit margins are hidden.
  - Potential profit is masked.
  - Delete buttons are disabled.
  - Can search inventory, add products, adjust stock counts, create bills, and manage customers.

---

## 4. Complete Database Architecture (PostgreSQL Schema)

The database schema is defined in [backend/src/db/schema.sql](file:///Users/srinjoyroy/Documents/Stocks%20Saree%20App/backend/src/db/schema.sql).

### 4.1 Tables Specification

#### 1. `public.shops`
Stores shop profiles and accounts.
- `id` (TEXT, PK): Unique shop ID (format `shop_<timestamp>_<random>`).
- `user_id` (TEXT): Supabase Auth User ID linking to `auth.users.id`.
- `name` (TEXT, NOT NULL): Registered business/store name (e.g., "Sri Lakshmi Sarees").
- `owner_name` (TEXT, NOT NULL): Proprietor's name.
- `phone` (TEXT, NOT NULL): Contact phone number.
- `email` (TEXT): Normalized email identifier.
- `business_type` (TEXT, NOT NULL, DEFAULT `'Saree'`): `'Saree'`, `'Garments'`, or `'General'`.
- `language` (TEXT, NOT NULL, DEFAULT `'en'`): Preferred UI language code.
- `pin` (TEXT): Optional PIN code for counter locking.
- `address` (TEXT): Physical shop address.
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- *Indexes*: `idx_shops_user_id`, `idx_shops_phone`.

#### 2. `public.products`
Tracks master inventory of sarees and apparel.
- `id` (TEXT, PK): Unique product ID (format `prod_<timestamp>_<random>`).
- `shop_id` (TEXT, NOT NULL, FK -> `shops.id` ON DELETE CASCADE).
- `code` (TEXT, NOT NULL): SKU or barcode (e.g., `KC-001`, `SKU-4912`).
- `name` (TEXT, NOT NULL): Saree design or product name.
- `category` (TEXT, NOT NULL, DEFAULT `'Saree'`): E.g., `Silk`, `Handloom`, `Cotton`, `Banarasi`, `Chanderi`, `Tussar`, `Georgette`, `General`.
- `quantity` (INT, NOT NULL, DEFAULT 0): Physical units available in shop.
- `cost_price` (NUMERIC(12,2), NOT NULL, DEFAULT 0): Purchase price paid to weaver/supplier.
- `selling_price` (NUMERIC(12,2), NOT NULL, DEFAULT 0): Listed counter price tag.
- `alert_level` (INT, NOT NULL, DEFAULT 2): Minimum stock threshold for low-stock warning.
- `supplier` (TEXT): Weaver, wholesaler, or society name.
- `color_notes` (TEXT): Fabric details, color descriptors, zari notes.
- `photo` (TEXT): Optional product photo URL.
- `archived` (BOOLEAN, NOT NULL, DEFAULT `FALSE`): Soft-delete flag.
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- *Indexes*: `idx_products_shop_id`, `idx_products_code`, `idx_products_category`.

#### 3. `public.stock_movements`
Immutable audit log tracking all inventory adjustments and sales.
- `id` (TEXT, PK): Unique movement ID (format `move_<timestamp>_<random>`).
- `shop_id` (TEXT, NOT NULL, FK -> `shops.id` ON DELETE CASCADE).
- `product_id` (TEXT, NOT NULL, FK -> `products.id` ON DELETE CASCADE).
- `product_name` (TEXT, NOT NULL): Name snapshot at time of movement.
- `type` (TEXT, NOT NULL): `'purchase'`, `'sale'`, `'adjustment'`, or `'return'`.
- `quantity_change` (INT, NOT NULL): Positive for stock additions, negative for deductions.
- `previous_quantity` (INT, NOT NULL): Stock level before movement.
- `new_quantity` (INT, NOT NULL): Stock level after movement.
- `reason` (TEXT): Audit reason (e.g., `"Sale Bill #BILL-1001"`, `"Damaged in Shop"`, `"Weaving Defect"`).
- `date` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- *Indexes*: `idx_stock_movements_shop_id`, `idx_stock_movements_product_id`.

#### 4. `public.bills`
Records completed sales transactions issued at the billing counter.
- `id` (TEXT, PK): Unique bill ID (format `bill_<epoch>_<random>`).
- `shop_id` (TEXT, NOT NULL, FK -> `shops.id` ON DELETE CASCADE).
- `bill_no` (TEXT, NOT NULL): Human-readable sequential invoice number (e.g., `BILL-1001`).
- `date` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- `customer_name` (TEXT): Customer name if provided.
- `customer_phone` (TEXT): Customer phone for WhatsApp receipts.
- `items` (JSONB, NOT NULL, DEFAULT `'[]'`): Array of billed items with snapshot costs and prices.
- `subtotal` (NUMERIC(12,2), NOT NULL, DEFAULT 0): Sum of agreed item prices before bill discount.
- `discount` (NUMERIC(12,2), NOT NULL, DEFAULT 0): Overall bill discount given.
- `total` (NUMERIC(12,2), NOT NULL, DEFAULT 0): Final net payable amount (`subtotal - discount`).
- `total_cost` (NUMERIC(12,2), NOT NULL, DEFAULT 0): Total cost price of all items sold.
- `total_profit` (NUMERIC(12,2), NOT NULL, DEFAULT 0): Actual net profit realized (`total - total_cost`).
- `payment_mode` (TEXT, NOT NULL, DEFAULT `'Cash'`): `'Cash'`, `'UPI'`, `'Card'`, `'Credit'`, or `'Part'`.
- `status` (TEXT, NOT NULL, DEFAULT `'completed'`): `'completed'`, `'cancelled'`, or `'returned'`.
- `created_by` (TEXT, NOT NULL, DEFAULT `'owner'`): Role of user who created bill (`'owner'` or `'staff'`).
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- *Indexes*: `idx_bills_shop_id`, `idx_bills_date`.

#### 5. `public.customers`
Customer address book and Udhaar (Credit) ledger.
- `id` (TEXT, PK): Unique customer ID (format `cust_<timestamp>`).
- `shop_id` (TEXT, NOT NULL, FK -> `shops.id` ON DELETE CASCADE).
- `name` (TEXT, NOT NULL): Customer name.
- `phone` (TEXT, NOT NULL): Customer mobile phone.
- `balance_due` (NUMERIC(12,2), NOT NULL, DEFAULT 0): Outstanding credit/udhaar owed to shop.
- `total_spent` (NUMERIC(12,2), NOT NULL, DEFAULT 0): Cumulative lifetime spending.
- `last_purchase_date` (TIMESTAMPTZ, DEFAULT `NOW()`).
- *Constraints*: `UNIQUE(shop_id, phone)`.
- *Indexes*: `idx_customers_shop_id`, `idx_customers_phone`.

#### 6. `public.goals`
Monthly profit targets and sales pacing.
- `id` (TEXT, PK): Unique goal ID (format `goal_<shopId>_<YYYY-MM>`).
- `shop_id` (TEXT, NOT NULL, FK -> `shops.id` ON DELETE CASCADE).
- `month` (TEXT, NOT NULL): Month identifier in `YYYY-MM` format.
- `profit_target` (NUMERIC(12,2), NOT NULL, DEFAULT 50000): Target take-home net profit in INR.
- `sales_target` (NUMERIC(12,2), NOT NULL, DEFAULT 150000): Target gross turnover in INR.
- `pieces_target` (INT, NOT NULL, DEFAULT 50): Target saree count to sell.
- *Constraints*: `UNIQUE(shop_id, month)`.
- *Indexes*: `idx_goals_shop_month`.

#### 7. `public.admin_config`
Global master controls, platform notices, and family/VIP whitelist overrides.
- `id` (TEXT, PRIMARY KEY, DEFAULT `'global_config'`).
- `global_subscription_enabled` (BOOLEAN, NOT NULL, DEFAULT `FALSE`): Master switch. When `FALSE`, platform is 100% free with no paywalls.
- `trial_action_limit` (INT, NOT NULL, DEFAULT 25): Free actions allowed before paywall appears (when subscription is ON).
- `whitelisted_users` (JSONB, NOT NULL, DEFAULT `'[]'`): Array of `{ id, identifier, name, notes, addedAt }`.
- `platform_notice` (TEXT): Announcement banner text displayed to users.
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).

---

### 4.2 Atomic Billing Stored Procedure (`public.atomic_create_bill`)

To prevent overselling and race conditions on high-traffic festival counters, bill creation and stock deduction execute inside an ACID transaction in PostgreSQL via `SECURITY DEFINER`:

```sql
FUNCTION public.atomic_create_bill(
  p_shop_id TEXT,
  p_bill_no TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_items JSONB,
  p_subtotal NUMERIC,
  p_discount NUMERIC,
  p_total NUMERIC,
  p_total_cost NUMERIC,
  p_total_profit NUMERIC,
  p_payment_mode TEXT,
  p_created_by TEXT
) RETURNS JSONB
```

**Step-by-Step Stored Procedure Execution**:
1. Generates unique bill ID: `'bill_' || epoch || '_' || random_hex`.
2. Iterates over `p_items` array:
   - Acquires row-level exclusive lock on each product row: `SELECT quantity FROM public.products WHERE id = ... FOR UPDATE`.
   - Computes `v_new_qty := GREATEST(0, v_current_qty - quantity)`.
   - Updates `public.products` with new quantity.
   - Automatically inserts a row into `public.stock_movements` with `type = 'sale'` and reason `'Sale Bill #' || p_bill_no`.
3. Inserts complete bill record into `public.bills`.
4. If `p_customer_phone` is present:
   - Upserts into `public.customers` on conflict `(shop_id, phone)`.
   - Adds bill total to `total_spent`.
   - If `p_payment_mode = 'Credit'`, adds bill total to `balance_due`.
   - Updates `last_purchase_date` to `NOW()`.
5. Returns JSON response: `{ id, billNo, total, totalProfit, createdAt }`.

---

## 5. Unified API Contract & Endpoints

All endpoints are mounted under `/api` and return standardized responses:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### 5.1 Central Route Map

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Healthcheck and timestamp |
| `POST` | `/api/auth/register` | Public | Register user via Supabase admin and create shop |
| `GET` | `/api/auth/shops` | Public | Get shop profiles linked to a `userId` or `email` |
| `GET` | `/api/auth/all-shops` | Public | Super admin list of all shops across the platform |
| `GET` | `/api/products` | Bearer | Fetch non-archived products for `?shopId=xxx` |
| `POST` | `/api/products` | Bearer | Create single product and record initial stock movement |
| `PUT` | `/api/products/:id` | Bearer | Update product details, prices, or alert levels |
| `DELETE` | `/api/products/:id` | Bearer | Soft delete (archive) product |
| `POST` | `/api/products/:id/adjust` | Bearer | Adjust stock up/down with audit reason & movement log |
| `POST` | `/api/products/bulk` | Bearer | Bulk import products with duplicate strategies |
| `GET` | `/api/bills` | Bearer | Fetch all completed bills for `?shopId=xxx` |
| `POST` | `/api/bills` | Bearer | Create bill with atomic stock deduction (RPC) |
| `GET` | `/api/customers` | Bearer | Fetch all customers and balance due for `?shopId=xxx` |
| `POST` | `/api/customers` | Bearer | Create a new customer in shop address book |
| `POST` | `/api/customers/:id/payment`| Bearer | Record customer payment (reduces `balance_due`) |
| `POST` | `/api/customers/:id/credit` | Bearer | Add credit to customer (increases `balance_due`) |
| `GET` | `/api/goals` | Bearer | Fetch goal for `?shopId=xxx&month=YYYY-MM` |
| `POST` | `/api/goals` | Bearer | Create or update monthly profit and sales goals |
| `GET` | `/api/reports/monthly` | Bearer | Generate monthly closing report, COGS, dead stock |
| `GET` | `/api/admin/config` | Bearer | Fetch global subscription switch and whitelist |
| `POST` | `/api/admin/config` | Bearer | Update master subscription switch and trial limit |
| `POST` | `/api/admin/whitelist` | Bearer | Add phone/email to VIP lifetime free whitelist |
| `DELETE`| `/api/admin/whitelist/:id`| Bearer | Remove user from whitelist |
| `GET` | `/api/admin/fleet` | Bearer | Fleet statistics across all registered shops |
| `POST` | `/api/admin/clear-all` | Bearer | Nuclear reset: deletes all records from all tables |

---

## 6. Detailed Feature Modules & Business Logic

### 6.1 Authentication & Store Onboarding (`AuthScreen.tsx`)
- Three distinct tabs: **Sign In**, **Create Store Account**, and **Reset Password**.
- Supports 10-digit Indian phone numbers or standard email addresses.
- Passwords must be at least 6 characters.
- Store creation asks for: Store Name, Owner Name, Business Type (`Saree`, `Garments`, `General`), Phone, Email, Preferred Language (English, Hindi, Telugu, Tamil, Bengali, Marathi, Gujarati, Kannada), and Physical Address.
- On successful login, the active shop is cached in `localStorage ('tela_active_shop_id')`.

### 6.2 Quick Billing POS Counter (`BillingView.tsx`)
- **Fast Product Search**: Instant keystroke search by product code, name, category, or color notes. Shows matching items with current stock and listed price.
- **1-Tap Quick Add**: Displays top fast-moving sarees for 1-click addition to bill.
- **Line Item Negotiation**:
  - Displays listed price alongside an editable **Agreed Sold Price** field.
  - Automatically calculates real-time profit or loss per line item: `(soldPrice - costPrice) * quantity`.
  - When negotiated below cost, displays a high-visibility `LOSS ₹X` alert badge.
  - Line quantity can be adjusted with instant re-calculation.
- **Bill-Level Discount**:
  - Supports **₹ Flat Discount** or **% Percentage Discount**.
  - Net bill profit calculation: `Subtotal - Total Cost - Bill Discount`.
  - Displays a dedicated `BILL NET LOSS` warning banner if overall bill is negative margin.
- **Payment Modes Supported**:
  - `Cash`
  - `UPI` (Google Pay, PhonePe, Paytm)
  - `Card`
  - `Credit` (Automatically posts to the customer's Udhaar balance in `customers` table).
- **Invoice Sharing**:
  - Generates receipt with unique sequential number (`BILL-1001`).
  - **1-Tap WhatsApp Share**: Encodes a pre-formatted message:
    `*INVOICE: Tela* Bill: BILL-1001 Total: ₹XXXX Thank you!` and launches WhatsApp Web / app.

### 6.3 Saree & Garment Stock Management (`ProductList.tsx`, `ProductModal.tsx`)
- Displays all active inventory items with SKU, design name, category, stock pieces, cost price, selling price, and profit margin %.
- **Filtering & Search**:
  - Free-text search matching name, SKU, color notes, and supplier.
  - Category dropdown filter.
  - One-tap quick filter for **Low Stock Only** (`quantity <= alertLevel`) and **Out of Stock** (`quantity === 0`).
- **Aggregated Stock KPI Cards**:
  - Total pieces in stock across unique designs.
  - Total stock value at cost (invested working capital; masked for counter staff).
  - Total stock retail value (counter listed value).
  - Potential gross profit and average inventory margin %.
- **Product Actions**:
  - **Add Saree**: Create design with auto-generated SKU (`SKU-XXX`), category, cost price, selling price, alert level, supplier, and color notes.
  - **Edit Details**: Update pricing, names, or reorder levels.
  - **Duplicate Design**: Clones existing saree with suffix `(Copy)` and new SKU `-COPY`.
  - **Archive**: Soft-deletes product (`archived = true`).
  - **Export Inventory**: Downloads full stock list as native formatted Excel `.xlsx` or raw `.csv`.

### 6.4 Stock Audit Adjustment Engine (`StockAdjustModal.tsx`)
- Allows manual stock corrections with a mandatory audit reason.
- **Adjustment Modes**:
  - **Deduct Stock (Loss / Damage)**:
    - *Damaged in Shop*
    - *Weaving Defect / Returned to Weaver*
    - *Lost or Stolen*
    - *Gift / Promo Sample*
    - *Physical Count Correction*
    - *Other Reason*
  - **Add Stock (Restock / Return)**:
    - *New Restock / Purchase from Weaver*
    - *Customer Exchange / Returned*
    - *Physical Count Correction*
    - *Other Reason*
- Enforces non-negative inventory constraints (`quantity >= 0`).
- Every adjustment creates an immutable audit row in `public.stock_movements`.

### 6.5 Bulk Excel / CSV Import Engine (`ExcelUploadModal.tsx`, `utils/excel.ts`)
- Imports existing spreadsheets of up to 5,000+ sarees in seconds.
- **4-Step Import Wizard**:
  1. **Upload**: Drag-and-drop `.xlsx`, `.xls`, or `.csv`. Provides downloadable pre-formatted templates.
  2. **Column Mapping**: Automatically maps uploaded columns by fuzzy matching (e.g., matches "rate", "cost", or "purchase" to `costPrice`; matches "sku", "item no", or "code" to `code`). Allows manual override for all 9 fields.
  3. **Validation & Preview**: Scans all rows client-side before touching the database. Validates numeric prices, detects invalid quantities, and separates valid rows from invalid ones with detailed line-by-line error messages.
  4. **Duplicate Handling Strategy**:
     - `add`: Increments existing stock quantity by incoming quantity.
     - `overwrite`: Replaces existing pricing, quantity, and metadata with new sheet data.
     - `skip`: Ignores duplicate rows and only imports new designs.

### 6.6 Profit Goals & Sales Pace Tracking (`GoalsView.tsx`)
- Enables store owners to set and track monthly financial targets:
  - **Monthly Profit Target** (Default: ₹50,000).
  - **Target Gross Sales** (Default: ₹150,000).
  - **Target Pieces Sold** (Default: 60 sarees).
- **Live Performance & Pacing Calculations**:
  - Progress bar showing `% Achieved`.
  - Real-time **Profit Gap**: `Target Profit - Earned Profit`.
  - **Average Profit Per Saree Sold**: Derived from current month's completed sales.
  - **Sarees Needed**: `Profit Gap / Avg Profit Per Piece`.
  - **Daily Sales Pace**: Computes required sarees to sell per day: `Sarees Needed / Days Left in Month`.
  - **Pace Projection**: Projects month-end finish based on current velocity and flags whether the shop is on track or falling behind.
  - **Recommended Sarees to Push**: Identifies top in-stock designs with the highest unit profit margin to help staff close the gap faster.

### 6.7 Monthly Business Reports & Insights (`ReportsView.tsx`)
- Generates month-end P&L and inventory analytics:
  - **Plain-English Executive Summary**: Summarizes total sarees sold, gross revenue, net profit, total discount negotiated away, low-stock count, and dead stock capital.
  - **Financial Metrics**:
    - Opening Stock Pieces vs Closing Stock Pieces.
    - Gross Sales vs Cost of Goods Sold (COGS).
    - Net Gross Profit and overall margin %.
    - Discount Given and Average Discount % bargained away.
    - Loss-making sales count and total loss amount.
  - **Restock Suggestions Subtab**: Lists items where `quantity <= alert_level` and estimates days of inventory remaining.
  - **Dead Stock / Capital Locked Subtab**: Identifies sarees created 60+ days ago that have not sold, computing total locked-up working capital.
  - **Sales Log Subtab**: Chronological table of all bills issued in the month.
  - **Export & Print**: Full multi-sheet Excel export (`.xlsx`) and print-formatted CSS for physical filing.

### 6.8 Customer Udhaar (Credit) Ledger (`CustomersView.tsx`)
- Replaces traditional paper Khata books.
- Displays customer name, phone number, lifetime spending, and current balance due.
- **Actions**:
  - **Record Payment**: Deducts cash/UPI payment from customer's `balance_due`.
  - **Add Credit**: Increases customer's `balance_due` when buying on credit.
  - **1-Tap WhatsApp Reminder**: Generates polite localized message with shop name and exact outstanding balance:
    ```
    Namaste [Customer Name] ji,
    This is a gentle reminder from [Shop Name].
    Your current pending credit balance is ₹[Balance Due].
    Kindly arrange for payment at your earliest convenience.
    Thank you!
    ```
    Opens directly in WhatsApp with phone number pre-filled.

### 6.9 Super Admin Portal (`AdminDashboard.tsx`)
- Accessed via URL route `/#admin` or `/admin`.
- **Master Platform Subscription Switch**:
  - Global toggle button. When turned **OFF**, the app operates in **100% Free Mode** across all users and devices.
  - When turned **ON**, paywall triggers once a user exceeds the trial threshold.
- **Trial Action Threshold Configuration**:
  - Configurable counter action limit (default: 25 actions).
- **VIP & Family Lifetime Whitelist**:
  - Add phone numbers or emails with admin notes.
  - Whitelisted users permanently bypass paywalls, even when global subscription is active.
- **Fleet Monitoring Dashboard**:
  - Total registered stores.
  - Total cataloged sarees across all stores.
  - Total bills processed across the platform.
  - Total gross processed transaction volume (₹).
  - Directory table of all active stores and access tiers.
- **Nuclear Reset Button (`Clear All Database`)**:
  - Clears all records across all tables (stock movements, bills, customers, goals, products, shops) and resets admin config.

### 6.10 Monetization & Paywall Engine (`PaywallModal.tsx`)
- One-time **₹499 Lifetime License** model (zero recurring monthly fees).
- Intercepts user actions once free action count reaches the threshold limit.
- **Bypass Mechanisms**:
  1. If `global_subscription_enabled === false`, paywall is never triggered.
  2. If user identifier is in `whitelisted_users`, paywall is bypassed.
  3. If user enters VIP promo code (`family2026` or `vip`), lifetime license is activated immediately.
  4. Payment simulation activates lifetime license and sets `tela_licensed = true`.

### 6.11 Localization & Multi-Language Support (`Navbar.tsx`)
- Supports 8 major Indian commercial languages:
  1. **English** (`en`)
  2. **हिन्दी** (Hindi - `hi`)
  3. **తెలుగు** (Telugu - `te`)
  4. **தமிழ்** (Tamil - `ta`)
  5. **বাংলা** (Bengali - `bn`)
  6. **मराठी** (Marathi - `mr`)
  7. **ગુજરાતી** (Gujarati - `gu`)
  8. **ಕನ್ನಡ** (Kannada - `kn`)
- Persisted per-store in the `shops` table.

---

## 7. Frontend Client Architecture & Data Flow

### 7.1 Type-Safe API Client (`api/client/client.ts`)

All communication between the React frontend and Express backend flows through the `api` client singleton:
- Reads `VITE_API_URL` from Vite environment (defaults to `/api`).
- Automatically calls `getSupabaseSession()` before every HTTP request.
- If an active session exists, injects HTTP header: `Authorization: Bearer <access_token>`.
- Parses JSON responses, checks `response.ok` and `json.success !== false`.
- Throws formatted error messages if backend returns failure.

### 7.2 Main App State Management (`App.tsx`)

`App.tsx` orchestrates global store state:
- `shop`: Active logged-in shop profile.
- `allShops`: Fleet directory for admin views.
- `products`: Array of active inventory items.
- `bills`: Completed sales invoices.
- `customers`: Customer ledger and Udhaar balances.
- `currentGoal`: Active month's profit/sales targets.
- `adminConfig`: Global admin switch, whitelist, and trial limits.
- `monthSummary`: Computed monthly P&L and stock health metrics.
- `userRole`: `'owner'` or `'staff'`.
- `actionCount`: Tracks user operations toward trial limit.
- `isAdminRoute`: Detects `/#admin` or `/admin` route changes.

---

## 8. Environment Variables & Deployment

### 8.1 Required Variables (`.env`)

```ini
# Server Port
PORT=5001

# Supabase Cloud Configuration (https://supabase.com -> Project Settings -> API)
# Recommended Region: South Asia (Mumbai) [ap-south-1]
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key

# Master Admin Secret Key (for /#admin portal)
ADMIN_SECRET_KEY=tela_admin_2026
```

### 8.2 Execution Scripts (`package.json`)

- `npm run dev`: Runs frontend (port 5173) and backend (port 5001) concurrently.
- `npm run dev:frontend`: Starts Vite dev server.
- `npm run dev:backend`: Starts Express backend with `tsx watch` auto-reload.
- `npm run build`: Compiles TypeScript and builds production frontend bundle into `dist/`.
- `npm run start`: Runs production backend server (serves API and static `dist/` bundle).
- `npm run lint`: Runs Oxlint for high-performance static code analysis.

### 8.3 Production Serving Architecture

In production:
- The Express server (`backend/src/server.ts`) mounts API routes under `/api`.
- All other HTTP requests are served from the compiled Vite SPA bundle in `dist/index.html`.
- Enables single-container deployment (Render, Railway, Fly.io, or VPS) with zero CORS configuration needed.

---

## 9. Key Business Rules & Formulas

1. **Unit Profit**:
   $$\text{Profit} = \text{Sold Price} - \text{Cost Price}$$
2. **Gross Margin %**:
   $$\text{Margin \%} = \frac{\text{Sold Price} - \text{Cost Price}}{\text{Sold Price}} \times 100$$
3. **Bill Net Profit**:
   $$\text{Bill Profit} = \sum (\text{Sold Price} - \text{Cost Price}) \times \text{Quantity} - \text{Overall Bill Discount}$$
4. **Pacing Sarees Needed**:
   $$\text{Sarees Needed} = \left\lceil \frac{\max(0, \text{Target Profit} - \text{Earned Profit})}{\text{Average Profit Per Saree}} \right\rceil$$
5. **Daily Pace Required**:
   $$\text{Daily Pace} = \frac{\text{Sarees Needed}}{\max(1, \text{Days Remaining in Month})}$$
6. **Projected Month-End Finish**:
   $$\text{Projected Profit} = \left( \frac{\text{Earned Profit}}{\text{Day of Month}} \right) \times \text{Total Days in Month}$$
7. **Dead Stock Identification**:
   $$\text{Item Age} \ge 60 \text{ days} \quad \text{AND} \quad \text{Quantity} > 0$$
   $$\text{Locked Capital} = \text{Quantity} \times \text{Cost Price}$$
8. **Restock Warning**:
   $$\text{Quantity} \le \text{Alert Level}$$
   $$\text{Estimated Days Left} = \max(1, \lfloor \text{Quantity} \times 2.5 \rfloor)$$

---

*Document compiled directly from verified repository source code without extrapolation or hallucination.*
