# Tela — TODO List

> **Last verified**: September 2026. Build ✅ Lint ✅ (0 errors, 4 warnings).  
> **Status**: Phase 1 complete. Phase 2 items below are pending.

---

## ✅ Completed (Phase 1)

- [x] Supabase full integration (auth, products, bills, customers, goals, reports, admin)
- [x] Security hardening: requireAuth, requireShop (IDOR prevention), requireAdmin
- [x] Rate limiting, helmet, CORS
- [x] Staff role sanitization (hide cost/profit)
- [x] Database wipe protection (`ALLOW_DATABASE_RESET` env flag)
- [x] Indian number formatting (Lakh/Crore) — `formatINR()` in all views
- [x] Multi-language UI strings (en, hi, bn, te, ta, mr, gu, kn)
- [x] Server-side pagination for products and bills
- [x] Custom date-range reports (`GET /api/reports/range`)
- [x] Month-on-month comparison reports (`GET /api/reports/compare`)
- [x] Goal history endpoint (`GET /api/reports/goal-history`)
- [x] Excel export for date-range reports
- [x] Bill cancellation with stock restoration and credit reversal
- [x] Customer transaction audit ledger
- [x] Stock movement audit trail

---

## ✅ Completed (Phase 2 - High Priority)

- [x] **Suppliers Table & Ledger**: Created `suppliers` table, `api/routes/suppliers.routes.ts`, and full `SuppliersView` UI. Tracks contact details, GSTIN, total purchases, total paid, and pending payables.
- [x] **Purchase Orders & Restocking**: Created `purchase_orders` table, `api/routes/purchases.routes.ts`, and inward restocking flow. Automatically increases stock quantity, logs stock movements, tracks payables, and allows recording supplier payments.
- [x] **Product Photos**: Added photo upload zone in `ProductModal.tsx`, thumbnail rendering in `ProductList.tsx`, and `POST /api/products/:id/photo` endpoint with Supabase Storage integration and graceful fallback.
- [x] **Customer Server-Side Pagination**: Added `?page=&limit=&search=` query support to `GET /api/customers`, updated client methods, and added pagination controls & live search in `CustomersView.tsx`.
- [x] **Goal History UI**: Built 12-month performance log in `GoalsView.tsx` with monthly targets, actual profits, sales, pieces sold, and visual HIT/MISSED status badges.

---

## 🔲 Pending (Phase 2) — Medium & Low Priority

### Medium Priority

- [ ] **Barcode/QR Scanning**: Not built. Would need a barcode scanning library (e.g., `quagga2` or `html5-qrcode`). Map scanned codes to product SKU codes.
- [ ] **GST Invoices**: Not built. Need to implement GST invoice generation with proper tax slab support for apparel (currently 5% for items under ₹1000, 12% for items ₹1000+). Generate PDF invoices.
- [ ] **Backup & Restore**: No user-visible backup. Add scheduled Supabase backups and a "Download Shop Data" / "Restore" flow for shop owners.
- [ ] **Language Verification**: Language is stored and translation keys exist, but verify that ALL UI strings use `t()` function. Many hardcoded English strings likely remain in components.
- [ ] **Bill Editing**: Currently bills can only be created or cancelled. No way to edit an existing bill (e.g., change quantity, add item).
- [ ] **Customer Editing/Deletion**: No endpoint or UI to edit customer name/phone or soft-delete a customer.

### Low Priority / Polish

- [ ] **Code Splitting**: Vite build warns chunk is >500KB. Add dynamic `import()` for heavy components (ReportsView, AdminDashboard).
- [ ] **Dexie Cleanup**: Remove Dexie/IndexedDB code entirely since everything uses Supabase now. Remove `dexie` from package.json. Keep only `clearAllDatabase` for localStorage cleanup.
- [ ] **Reports on Server**: Currently some report calculations happen client-side with data fetched in bulk. Move all aggregation to server-side SQL for performance at scale.
- [ ] **Multi-shop Switcher UI**: The app supports multiple shops per user, but there's no UI to switch between shops. Currently defaults to the first shop.
- [ ] **Dark Mode**: No dark mode. The CSS uses hardcoded white backgrounds.
- [ ] **Mobile Responsive**: Verify all components work well on mobile screens. The Navbar and tables may need responsive breakpoints.
- [ ] **PWA / Offline**: No service worker or PWA manifest. The app claims "Offline Ready" in the footer but is not actually offline-capable since Dexie is no longer primary.
- [ ] **Notifications / Reminders**: No push notifications for low stock alerts, goal reminders, or Udhaar due dates.
- [ ] **Audit Log UI**: Stock movements and customer transactions are recorded but there's no dedicated UI to browse the full audit trail.
- [x] **Excel Template Download & Bulk Import Overhaul**: Fixed template `.xlsx` download failure via dual binary Blob + SheetJS fallback; added smart multi-row header detection; implemented robust currency/number scraper (`parseCleanNumber`); hardened `POST /api/products/bulk` with collision-free SKU generation, duplicate handling (`add`, `overwrite`, `skip`), error verification, and stock movement logs. Added direct "Template (.xlsx)" and clear "Export (.xlsx)" buttons in header and modal.

---

## 🐛 Known Issues

| Issue | Severity | Details |
|-------|----------|---------|
| `atomic_create_bill` RPC duplication | Medium | If multiple function signatures exist in Supabase, billing fails with error `42725`. Fix: drop duplicate signatures in Supabase SQL editor. The JS fallback handles this gracefully. |
| Lint: impure render functions | Low | `Date.now()` and `Math.random()` called during render in BillingView. Move ID generation to event handlers. |
| Lint: setState in useEffect | Low | `loadData()` in App.tsx's useEffect triggers cascading renders. Could refactor to use React Query or similar. |
| Footer claims "Offline Ready" | Low | The footer says "Status: Offline Ready" but the app requires Supabase. Update the text or implement actual offline support. |
| Admin portal access | Low | The admin URL `/#admin` is visible in the footer. Consider hiding it or removing the link from the UI. |
| Family code hardcoded | Low | PaywallModal accepts `family2026` and `vip` as hardcoded lifetime codes. Move to server-side validation. |

---

## 📁 Key Files to Edit for Each Feature

| Feature | Files to Modify |
|---------|----------------|
| Suppliers | `api/types/index.ts`, new `api/routes/suppliers.routes.ts`, `api/routes/index.ts`, `api/client/client.ts`, new `frontend/src/components/suppliers/SuppliersView.tsx`, `App.tsx`, `Navbar.tsx` |
| Product Photos | `api/routes/products.routes.ts`, `frontend/src/components/products/ProductModal.tsx`, `ProductList.tsx`, Supabase Storage bucket setup |
| Barcode | New library in `package.json`, `frontend/src/components/products/BarcodeScanner.tsx`, `BillingView.tsx` |
| GST Invoice | `api/types/index.ts` (invoice type), new `api/routes/invoices.routes.ts`, new `frontend/src/components/billing/InvoiceView.tsx` |
| Goal History UI | `frontend/src/components/goals/GoalsView.tsx`, `api/client/client.ts` (already has `getGoalHistory`) |
| Customer Pagination | `api/routes/customers.routes.ts`, `api/client/client.ts`, `frontend/src/components/customers/CustomersView.tsx` |
| Dark Mode | `frontend/src/index.css`, `frontend/src/App.css`, CSS variables |
| Multi-shop Switcher | `frontend/src/components/layout/Navbar.tsx`, `App.tsx` |

---

## 🔧 Development Notes for Other Models

1. **Always run `npm run build` after changes** — TypeScript errors will catch issues before runtime.
2. **All routes use `requireAuth + requireShop`** except auth routes and health check. Don't skip these middlewares.
3. **Database columns are snake_case**, TypeScript is camelCase. Every route has a `mapXxx()` function at the bottom for conversion.
4. **`shopId` comes from `req.shopId`** (set by `requireShop` middleware), NOT from the request body. This prevents IDOR.
5. **Frontend types re-export from `api/types`** — only edit types in `api/types/index.ts`, not in `frontend/src/types/index.ts`.
6. **`formatINR()` must be used** instead of `toLocaleString()` for currency display. Import from `frontend/src/utils/i18n.ts`.
7. **Admin routes require `requireAdmin`** — never use just `requireAuth` for admin operations.
