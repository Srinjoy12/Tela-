# Tela — Complete Application Context

> **Purpose of this document**: Give any AI model (Claude, GPT, Gemini, etc.) full context about this codebase so it can continue development without hallucinating. Every fact stated here is verified against the actual source code as of September 2026.

---

## 1. What Is Tela?

Tela (टेला) is a **web-based inventory, billing, and profit tracking application** designed for **Indian saree & garment retailers**. It provides:

- Product inventory management with stock alerts
- Point-of-Sale (POS) billing with bargaining/discount support
- Customer credit (Udhaar) ledger
- Monthly profit goals and tracking
- Reports with dead stock analysis, restock suggestions, and MoM comparison
- Multi-shop support (one user can own multiple shops)
- Super Admin portal for fleet monitoring
- Indian number formatting (Lakh/Crore)
- Multi-language UI strings (Hindi, Bengali, Telugu, Tamil, Marathi, Gujarati, Kannada)

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 19 + TypeScript | Single-page app, Vite 8 bundler |
| **Backend** | Express 5 + TypeScript | REST API server |
| **Database** | Supabase (PostgreSQL) | Cloud-hosted, service-role key on backend |
| **Local DB** | Dexie (IndexedDB) | Legacy offline fallback, still in code but not primary |
| **Auth** | Supabase Auth | JWT-based, phone-to-email mapping (`9876543210@tela.app`) |
| **Styling** | Vanilla CSS | `index.css` + `App.css`, no Tailwind |
| **Icons** | lucide-react | |
| **Excel** | xlsx (SheetJS) | Import/export product data |
| **Security** | helmet, cors, express-rate-limit | |
| **Dev Runner** | concurrently, tsx watch | `npm run dev` starts both servers |

---

## 3. Project Structure

```
Stocks Saree App/
├── .env                          # Real credentials (gitignored)
├── .env.example                  # Template with placeholders
├── package.json                  # Scripts: dev, build, lint, start
├── vite.config.ts                # Vite config: root=./frontend, proxy /api → :5001
├── tsconfig.json                 # References tsconfig.app.json + tsconfig.node.json
├── tsconfig.app.json             # Frontend TS config
├── tsconfig.node.json            # Backend TS config
│
├── api/                          # Shared API layer (used by both frontend & backend)
│   ├── index.ts                  # Re-export (unused barrel)
│   ├── supabase.ts               # Server-side Supabase client (service-role key)
│   ├── client/
│   │   └── client.ts             # Frontend HTTP client (fetch wrapper with JWT)
│   ├── middleware/
│   │   └── auth.middleware.ts     # requireAuth, requireShop, requireAdmin, sanitizeForStaff
│   ├── routes/
│   │   ├── index.ts              # Master router: mounts all route modules
│   │   ├── auth.routes.ts        # POST /register, GET /shops, GET /all-shops
│   │   ├── products.routes.ts    # CRUD + adjust + bulk import
│   │   ├── bills.routes.ts       # Create bill + cancel bill (with stock restore)
│   │   ├── customers.routes.ts   # CRUD + payment + credit + transactions
│   │   ├── goals.routes.ts       # Get/upsert monthly goals
│   │   ├── reports.routes.ts     # monthly, range, compare, goal-history
│   │   └── admin.routes.ts       # config, whitelist, fleet, clear-all
│   └── types/
│       └── index.ts              # All shared TypeScript interfaces
│
├── backend/
│   ├── src/
│   │   └── server.ts             # Express app entry: helmet, cors, rate-limit, API mount
│   └── data/
│       └── tela_db.json   # Legacy JSON DB (empty/unused)
│
├── frontend/
│   ├── index.html                # Vite entry HTML
│   └── src/
│       ├── main.tsx              # React DOM render
│       ├── App.tsx               # Root component: auth flow, data loading, tab routing
│       ├── App.css               # App-specific styles
│       ├── index.css             # Global design system
│       ├── types/
│       │   └── index.ts          # Re-exports from api/types
│       ├── utils/
│       │   ├── supabase.ts       # Frontend Supabase client (anon key)
│       │   ├── i18n.ts           # formatINR, t(), formatDate, formatNumber
│       │   └── excel.ts          # Excel export/import helpers
│       ├── db/
│       │   └── index.ts          # Dexie IndexedDB (legacy offline mode)
│       ├── components/
│       │   ├── auth/
│       │   │   └── AuthScreen.tsx          # Sign In / Create Account tabs
│       │   ├── layout/
│       │   │   └── Navbar.tsx              # Top navigation bar
│       │   ├── dashboard/
│       │   │   └── DashboardView.tsx       # Business overview cards
│       │   ├── products/
│       │   │   ├── ProductList.tsx         # Product table with pagination, search, export
│       │   │   ├── ProductModal.tsx        # Add/Edit product form
│       │   │   ├── StockAdjustModal.tsx    # Stock +/- adjustment modal
│       │   │   └── ExcelUploadModal.tsx    # Excel bulk import UI
│       │   ├── billing/
│       │   │   ├── BillingView.tsx         # POS billing with cart, bargain, discount
│       │   │   └── BillReceiptModal.tsx    # Print-ready receipt
│       │   ├── goals/
│       │   │   └── GoalsView.tsx           # Monthly profit/sales/pieces targets
│       │   ├── reports/
│       │   │   └── ReportsView.tsx         # Tabbed: Monthly, Date Range, MoM Compare
│       │   ├── customers/
│       │   │   └── CustomersView.tsx       # Udhaar ledger, payments, credit
│       │   ├── admin/
│       │   │   └── AdminDashboard.tsx      # Super admin: fleet, config, whitelist
│       │   └── subscription/
│       │       └── PaywallModal.tsx        # Trial/paywall UI
│       └── assets/                         # Static assets (unused currently)
│
└── dist/                         # Production build output
```

---

## 4. Environment Variables

```env
PORT=5001                         # Express server port
VITE_SUPABASE_URL=                # Supabase project URL (used by frontend + backend)
VITE_SUPABASE_ANON_KEY=           # Supabase anon key (used by frontend)
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service-role key (backend only, bypasses RLS)
ADMIN_SECRET_KEY=                 # Secret for admin access via X-Admin-Key header
ADMIN_EMAIL=                      # Email that gets auto-admin role
ALLOW_DATABASE_RESET=             # Set to 'true' to enable POST /api/admin/clear-all
APP_URL=                          # Production URL for CORS whitelist
```

**IMPORTANT**: `VITE_` prefixed vars are exposed to the frontend via Vite. The `SUPABASE_SERVICE_ROLE_KEY` is backend-only and must NEVER be exposed to the client.

---

## 5. Scripts

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Starts both backend (tsx watch on :5001) and frontend (Vite on :5173) via concurrently |
| `npm run dev:frontend` | Vite dev server only |
| `npm run dev:backend` | Express server only with hot-reload |
| `npm run build` | `tsc -b && vite build` — TypeScript check then production bundle to `dist/` |
| `npm run lint` | oxlint — fast Rust-based linter |
| `npm start` | Production server: `tsx backend/src/server.ts` (serves dist/ for SPA) |

---

## 6. Supabase Database Schema

The following tables exist in Supabase (PostgreSQL). Column names use **snake_case** in the database and are mapped to **camelCase** in the TypeScript types.

### `shops`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `shop_{timestamp}_{random}` |
| name | text | Shop display name |
| owner_name | text | |
| phone | text | |
| email | text | The `@tela.app` email |
| business_type | text | 'Saree', 'Garments', 'General' |
| language | text | 'en', 'hi', 'bn', etc. |
| address | text | nullable |
| user_id | uuid | FK to Supabase auth.users.id |
| last_bill_seq | integer | Auto-incrementing bill counter |
| created_at | timestamptz | |

### `products`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `prod_{timestamp}_{random}` |
| shop_id | text FK→shops | |
| code | text | SKU code |
| name | text | |
| category | text | 'Saree', 'Garments', etc. |
| quantity | integer | Current stock count |
| cost_price | numeric | Purchase cost |
| selling_price | numeric | MRP/listed price |
| alert_level | integer | Low-stock threshold (default 2) |
| supplier | text | nullable |
| color_notes | text | nullable |
| archived | boolean | Soft delete flag |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `stock_movements`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| shop_id | text FK→shops | |
| product_id | text FK→products | |
| product_name | text | Denormalized |
| type | text | 'purchase', 'sale', 'adjustment', 'return' |
| quantity_change | integer | Positive=in, Negative=out |
| previous_quantity | integer | |
| new_quantity | integer | |
| reason | text | |
| date | timestamptz | |

### `bills`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `bill_{timestamp}_{random}` |
| shop_id | text FK→shops | |
| bill_no | text | `BILL-{sequence}` |
| date | timestamptz | |
| customer_name | text | nullable |
| customer_phone | text | nullable |
| items | jsonb | Array of bill items (embedded) |
| subtotal | numeric | |
| discount | numeric | |
| total | numeric | subtotal - discount |
| total_cost | numeric | COGS |
| total_profit | numeric | total - total_cost |
| payment_mode | text | 'Cash', 'UPI', 'Card', 'Credit', 'Part' |
| amount_paid | numeric | nullable |
| balance_due | numeric | nullable (credit amount) |
| status | text | 'completed', 'cancelled', 'returned' |
| created_at | timestamptz | |
| created_by | text | 'owner' or 'staff' |

### `customers`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `cust_{timestamp}` |
| shop_id | text FK→shops | |
| name | text | |
| phone | text | |
| balance_due | numeric | Outstanding Udhaar |
| total_spent | numeric | Lifetime purchases |
| last_purchase_date | timestamptz | |

### `customer_transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `tx_{timestamp}` |
| shop_id | text FK→shops | |
| customer_id | text FK→customers | |
| bill_id | text | nullable FK→bills |
| type | text | 'credit_sale', 'payment', 'adjustment', 'return_credit' |
| amount | numeric | |
| balance_after | numeric | |
| notes | text | |
| date | timestamptz | |

### `goals`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `goal_{shopId}_{month}` |
| shop_id | text FK→shops | |
| month | text | 'YYYY-MM' |
| profit_target | numeric | |
| sales_target | numeric | |
| pieces_target | integer | |

### `admin_config`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | 'global_config' (singleton) |
| global_subscription_enabled | boolean | Master paywall toggle |
| trial_action_limit | integer | Free actions before paywall |
| whitelisted_users | jsonb | Array of `{id, identifier, name, notes, addedAt}` |
| platform_notice | text | |
| updated_at | timestamptz | |

### Supabase RPC Function: `atomic_create_bill`
There is a PostgreSQL stored procedure `atomic_create_bill` that handles bill creation atomically (stock deduction + bill insert in one transaction). The JS fallback in `bills.routes.ts` handles the case where this RPC is not installed. **Known issue**: if multiple versions of this function exist, Supabase returns error `42725: function name is not unique`. Resolution: drop duplicate function signatures in Supabase SQL editor.

---

## 7. Authentication Flow

### Registration (Server-Side)
1. User fills Sign Up form on `AuthScreen.tsx`
2. Frontend calls `POST /api/auth/register` with `{email, password, shopName, ownerName, phone, businessType, language, address}`
3. Backend uses **Supabase Admin Auth** (`supabaseServer.auth.admin.createUser`) to create user with `email_confirm: true` (auto-confirmed)
4. Backend creates a `shops` row linked via `user_id`
5. Backend seeds a default `goals` row for the current month
6. Frontend receives user + shop data, signs in via `supabase.auth.signInWithPassword`

### Login (Client-Side)
1. User fills Sign In form
2. Frontend calls `signInWithSupabase()` which uses `supabase.auth.signInWithPassword`
3. On success, fetches shops via `GET /api/auth/shops` (authenticated)
4. Sets the first shop as active

### Phone-to-Email Mapping
Indian phone numbers (10 digits or 91+10 digits) are converted to email format: `9876543210@tela.app`. This function exists in both:
- `frontend/src/utils/supabase.ts` → `phoneToEmail()`
- `api/routes/auth.routes.ts` → `normalizeAuthEmail()`

### JWT Token Flow
1. Frontend's `getSupabaseSession()` retrieves the current session from Supabase client
2. `api/client/client.ts` → `requestRaw()` attaches `Authorization: Bearer {token}` to every API call
3. Backend `requireAuth` middleware validates the token via `supabaseServer.auth.getUser(token)`

---

## 8. Middleware Stack

### `requireAuth` (auth.middleware.ts)
- Extracts `Bearer` token from `Authorization` header
- Validates via `supabaseServer.auth.getUser(token)`
- Sets `req.user` with the Supabase user object
- Returns 401 if invalid

### `requireShop` (auth.middleware.ts)
- Requires `requireAuth` to have run first
- Resolves `shopId` from query params, route params, or body
- Fetches all shops belonging to `req.user` (by `user_id` or `email`)
- Verifies the requested shop belongs to the user (prevents IDOR)
- Sets `req.shopId`, `req.shop`, `req.userRole`
- Admins can access any shop

### `requireAdmin` (auth.middleware.ts)
- Checks `X-Admin-Key` header against `ADMIN_SECRET_KEY` env var
- OR checks if user email matches `ADMIN_EMAIL` env var
- OR checks `user_metadata.role === 'admin'`
- Returns 403 if none match

### `sanitizeForStaff` (auth.middleware.ts)
- Strips `costPrice`, `profit`, `totalCost` fields from responses when `role === 'staff'`

---

## 9. API Endpoints Reference

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Register user + create shop |
| GET | `/shops` | requireAuth | Get shops for authenticated user |
| GET | `/all-shops` | requireAuth + requireAdmin | Get all shops (admin only) |

### Products (`/api/products`) — All require `requireAuth + requireShop`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List products with pagination (`?page=&limit=&search=&category=&archived=`) |
| POST | `/` | Create product |
| PUT | `/:id` | Update product |
| DELETE | `/:id` | Soft-delete (archive) product |
| POST | `/:id/adjust` | Stock adjustment (+/-) with audit log |
| POST | `/bulk` | Bulk import with strategy (add/overwrite/skip) |

### Bills (`/api/bills`) — All require `requireAuth + requireShop`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List bills with pagination (`?page=&limit=&month=&from=&to=&status=`) |
| POST | `/` | Create bill (deducts stock, updates customer ledger) |
| POST | `/:id/cancel` | Cancel bill (restores stock, reverses customer credit) |

### Customers (`/api/customers`) — All require `requireAuth + requireShop`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all customers |
| POST | `/` | Create customer |
| POST | `/:id/payment` | Record payment against balance |
| POST | `/:id/credit` | Add credit to balance |
| GET | `/:id/transactions` | Get transaction ledger |

### Goals (`/api/goals`) — All require `requireAuth + requireShop`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get goal for month (`?month=YYYY-MM`) |
| POST | `/` | Create or update goal |

### Reports (`/api/reports`) — All require `requireAuth + requireShop`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/monthly` | Monthly P&L summary (`?month=YYYY-MM`) |
| GET | `/range` | Custom date range report (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) |
| GET | `/compare` | Month-on-month comparison (`?month=YYYY-MM`) |
| GET | `/goal-history` | Last N months of goals vs actuals (`?months=12`) |

### Admin (`/api/admin`) — All require `requireAuth + requireAdmin`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/config` | Get global admin config |
| POST | `/config` | Update admin config |
| POST | `/whitelist` | Add user to VIP whitelist |
| DELETE | `/whitelist/:id` | Remove user from whitelist |
| GET | `/fleet` | Fleet stats across all shops |
| POST | `/clear-all` | Wipe all data (requires `ALLOW_DATABASE_RESET=true`) |

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | Public | Returns `{status: 'ok'}` |

---

## 10. Frontend Components Reference

### `App.tsx` (Root Component)
- **State**: shop, products, bills, customers, currentGoal, monthSummary, adminConfig, etc.
- **Flow**: Loading → Auth check → Admin route check → AuthScreen (if no shop) → Main app
- **Data loading**: `loadData()` fetches all data for active shop via API client
- **Tab routing**: DASHBOARD, PRODUCTS, BILLING, GOALS, REPORTS, CUSTOMERS
- **Modals**: ProductModal, StockAdjustModal, ExcelUploadModal, PaywallModal

### `AuthScreen.tsx`
- Two tabs: "Sign In" and "Create Account"
- Sign In: email/phone + password → `signInWithSupabase()` → fetch shops → login
- Create Account: Two-step flow (Supabase auth → shop registration)
- Password reset via `resetPasswordForEmail()`

### `Navbar.tsx`
- Tab navigation: DASHBOARD, PRODUCTS, BILLING, GOALS, REPORTS, CUSTOMERS
- Shop info display, language selector, role switcher (owner/staff), logout button
- Subscription badge display

### `DashboardView.tsx`
- Cards: Total Revenue, Counter Profit, Pieces Sold, Low Stock Count
- Quick action buttons: Add Product, Upload Excel
- Low stock alerts list
- Uses `formatINR()` from i18n

### `ProductList.tsx`
- Table with columns: Code, Name, Category, Qty, Cost, Selling, Margin, Supplier
- **Server-side pagination**: page/limit controls, prev/next buttons
- Search by name/code
- Filter by category
- Actions: Edit, Duplicate, Delete, Adjust Stock
- Excel export button
- Staff role hides cost/profit columns

### `ProductModal.tsx`
- Add/Edit form: code, name, category, quantity, costPrice, sellingPrice, alertLevel, supplier, colorNotes
- Auto-calculates profit margin preview

### `StockAdjustModal.tsx`
- Adjust stock: type (purchase/adjustment/return), quantity, reason
- Shows current stock level

### `ExcelUploadModal.tsx`
- Drag-and-drop or file-select for .xlsx/.xls/.csv
- Preview parsed data
- Duplicate strategy: Add quantities, Overwrite, Skip

### `BillingView.tsx`
- Product search and selection for cart
- Bargain price (sell below MRP)
- Discount (flat amount)
- Payment modes: Cash, UPI, Card, Credit (Udhaar), Part Payment
- Customer name/phone for credit tracking
- Bill creation with stock deduction
- Receipt modal after creation
- Uses `formatINR()`

### `BillReceiptModal.tsx`
- Print-ready receipt with shop name, items, totals
- Print button

### `GoalsView.tsx`
- Set monthly targets: Profit, Sales Revenue, Pieces to Sell
- Progress bars showing achievement percentage
- Uses `formatINR()`

### `ReportsView.tsx`
- **Three tabs**:
  1. **Monthly Summary**: P&L for selected month with key metrics
  2. **Date Range**: Custom from/to date picker, generates report, Excel export
  3. **MoM Comparison**: Current vs previous month with percentage change
- Sections: Revenue, Profit, Dead Stock, Restock Alerts, Aging Buckets
- Excel export for date range reports
- Uses `formatINR()`

### `CustomersView.tsx`
- Customer list with search
- Udhaar (credit) balance display
- Record payment modal
- Add credit modal
- Transaction history per customer
- Uses `formatINR()`

### `AdminDashboard.tsx`
- Accessed via `/#admin` URL
- Fleet monitoring: total shops, products, bills, gross volume
- Subscription toggle: enable/disable globally
- Trial action limit configuration
- Whitelist management: add/remove VIP users
- Platform notice editor
- Database clear button (with confirmation)

### `PaywallModal.tsx`
- Shows when trial limit exceeded
- Displays action count
- Lifetime license activation
- Family code input (`family2026` or `vip`)

---

## 11. Key Utility Functions

### `formatINR(amount, compact?)` — `frontend/src/utils/i18n.ts`
- Standard: `₹1,25,000` (Indian comma system)
- Compact: `₹1.25L`, `₹1.5Cr`, `₹500K`

### `t(key, lang)` — `frontend/src/utils/i18n.ts`
- Translation lookup for 8 Indian languages
- Falls back to English

### `formatNumber(n)` — `frontend/src/utils/i18n.ts`
- Indian comma formatting without currency symbol

### `formatDate(dateStr, lang)` — `frontend/src/utils/i18n.ts`
- Locale-aware date display

### `phoneToEmail(phone)` — `frontend/src/utils/supabase.ts`
- `9876543210` → `9876543210@tela.app`

### `sanitizeForStaff(data, role)` — `api/middleware/auth.middleware.ts`
- Strips cost/profit fields when role is 'staff'

---

## 12. Security Measures (Currently Implemented)

| Feature | Implementation |
|---------|---------------|
| JWT Auth | `requireAuth` validates Supabase JWT on every protected route |
| Multi-tenant isolation | `requireShop` verifies shop ownership, prevents IDOR |
| Admin protection | `requireAdmin` checks secret key, admin email, or role metadata |
| Rate limiting | 600 req/15min general, 25 req/15min for auth |
| Helmet | Security headers (CSP disabled for Vite) |
| CORS | Whitelist of allowed origins |
| Staff data sanitization | Cost/profit stripped for staff role |
| Database wipe protection | `ALLOW_DATABASE_RESET` env flag required |
| Soft delete | Products are archived, not deleted |

---

## 13. Data Flow Summary

```
User Action (Frontend)
  → api/client/client.ts (adds JWT Bearer token)
    → Express Server (backend/src/server.ts)
      → Rate Limiter
        → requireAuth middleware (validates JWT)
          → requireShop middleware (verifies shop ownership)
            → Route Handler (api/routes/*.routes.ts)
              → Supabase Client (api/supabase.ts, service-role key)
                → PostgreSQL (Supabase Cloud)
              ← Response mapped from snake_case to camelCase
            ← JSON response
          ← 403 if shop doesn't belong to user
        ← 401 if invalid token
      ← 429 if rate limited
    ← HTTP Response
  ← React state updated, UI re-renders
```

---

## 14. How to Run

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in Supabase credentials
cp .env.example .env

# 3. Development mode (both servers)
npm run dev

# 4. Frontend only: http://localhost:5173
# 5. Backend API: http://localhost:5001/api

# 6. Production build
npm run build
npm start    # Serves from dist/ on :5001
```

---

## 15. Known Lint Warnings (Non-blocking)

The linter (`oxlint`) reports 4 warnings, 0 errors:
1. `Date.now()` / `Math.random()` called during render in `BillingView.tsx` — impure function warning
2. `setState` called in `useEffect` in `App.tsx` — cascading render warning

These do not affect functionality or build.

---

## 16. Legacy Code (Still Present, Not Primary)

- `frontend/src/db/index.ts` — Dexie/IndexedDB local database. Still imported in `App.tsx` for `clearAllDatabase()` only. All actual data flows through Supabase API now.
- `backend/data/tela_db.json` — Old JSON-file database, empty.
- `dexie` package in `package.json` — Required by the legacy DB module.

---

## 17. File Size Reference

| File | Size | Lines |
|------|------|-------|
| `App.tsx` | 20KB | 624 |
| `ReportsView.tsx` | 41KB | ~1000 |
| `BillingView.tsx` | 24KB | ~650 |
| `AuthScreen.tsx` | 19KB | ~500 |
| `ProductList.tsx` | 16KB | ~430 |
| `CustomersView.tsx` | 17KB | ~450 |
| `AdminDashboard.tsx` | 15KB | ~400 |
| `bills.routes.ts` | 15KB | 464 |
| `products.routes.ts` | 13KB | 403 |
| `reports.routes.ts` | 13KB | 300 |
| `i18n.ts` | 10KB | 125 |
| `auth.middleware.ts` | 7KB | 213 |
