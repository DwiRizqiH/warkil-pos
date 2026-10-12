# Warkil-Kasir — Design Spec

**Date:** 2026-10-13
**Status:** approved design, awaiting implementation plan
**Supersedes:** the client-side mockup in `frontend/` and the conflicting parts of `docs/0`–`docs/7`

## 1. Goal

Turn the existing frontend mockup of *Warung Kikil Abang*'s cashier app into a working system:
a PostgreSQL-backed REST API that owns all business rules, with the React mockup integrated
against it until no mock data, demo affordance, or online-order remnant remains.

Success: a cashier logs in, builds an order, pays by cash or Midtrans sandbox, tracks it on the
Pesanan Kasir board, prints a nota, and navigates back to the POS without losing the cart. An
owner manages menus, categories and cashiers, marks the calendar, and reads dashboard, sales and
cashier-performance views. Payment is only ever recorded from server-verified data.

## 2. Actors and scope

| Actor | Can do |
|---|---|
| Owner | Dashboard, calendar, menus & categories, cashier management, sales, cashier performance |
| Cashier | Login with name + PIN, build orders, take payment, run the order board, read today's sales |

Out of scope, unchanged from the mockup: stock/inventory, table management, tax, vouchers,
availability toggles, customer accounts, file upload, void/refund of paid orders.

## 3. Repo layout

```
backend/          Express + TypeScript (strict) + Prisma
frontend/         Existing Vite + React (JS/JSX, plain CSS) — no Tailwind
deploy/           nginx site, deploy.sh (unchanged)
docs/             Project docs (rewritten to match this spec)
docker-compose.yml   PostgreSQL for local dev and tests
README.md         fresh-clone path: compose up, install, migrate, seed, run
CLAUDE.md         code style rules (written in Phase 2)
```

`backend/ecosystem.config.cjs` (pm2, port 3100) and the GitHub Actions deploy chain are kept as
they are. Express continues to serve `frontend/dist` with an SPA fallback, so API and UI share an
origin in production; Vite proxies `/api` to the backend in development.

## 4. Data model

Money is integer rupiah (`Int`) everywhere — never float, never decimal. Timestamps are UTC.
`businessDate` is a stored `date` computed in Asia/Jakarta at write time, so reports never do
per-query timezone math.

```prisma
enum Role          { OWNER CASHIER }
enum OrderStatus   { UNPAID PROCESSING READY COMPLETED CANCELLED }
enum OrderType     { DINE_IN TAKEAWAY }
enum PaymentMethod { CASH MIDTRANS }
enum PaymentStatus { PENDING PAID FAILED EXPIRED CANCELLED }
enum MarkType      { LIBUR EVENT }

model User {
  id             String    @id @default(uuid())
  name           String
  role           Role
  username       String?   @unique          // owner only
  passwordHash   String?                    // owner only
  pinHash        String?                    // cashier only
  isActive       Boolean   @default(true)
  failedPinCount Int       @default(0)
  pinLockedUntil DateTime?
  shifts         Shift[]
  orders         Order[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  @@map("users")
}

model Shift {
  id           String    @id @default(uuid())
  cashierId    String
  cashier      User      @relation(fields: [cashierId], references: [id])
  businessDate DateTime  @map("business_date") @db.Date
  startedAt    DateTime  @default(now()) @map("started_at")
  endedAt      DateTime? @map("ended_at")
  orders       Order[]
  @@index([cashierId, businessDate])
  @@index([businessDate])
  @@map("shifts")
}

model Category {
  id        String  @id @default(uuid())
  name      String
  sortOrder Int     @map("sort_order")
  isBundle  Boolean @default(false) @map("is_bundle")
  menus     Menu[]
  @@index([sortOrder])
  @@map("categories")
}

model Menu {
  id              String    @id @default(uuid())
  categoryId      String    @map("category_id")
  category        Category  @relation(fields: [categoryId], references: [id])
  name            String
  emoji           String?
  imageUrl        String?   @map("image_url")
  price           Int?      // null for bundles: price derives from components
  discountPercent Int?      @map("discount_percent")
  deletedAt       DateTime? @map("deleted_at")
  components      MenuComponent[] @relation("Bundle")
  usedIn          MenuComponent[] @relation("Component")
  orderItems      OrderItem[]
  @@index([categoryId])
  @@map("menus")
}

model MenuComponent {
  bundleId    String @map("bundle_id")
  componentId String @map("component_id")
  qty         Int
  bundle      Menu   @relation("Bundle", fields: [bundleId], references: [id])
  component   Menu   @relation("Component", fields: [componentId], references: [id])
  @@id([bundleId, componentId])
  @@map("menu_components")
}

model Order {
  id           String      @id @default(uuid())
  code         String      @unique              // TRX-YYYYMMDD-0001
  dailySeq     Int         @map("daily_seq")
  queueNumber  String?     @map("queue_number") // "001", assigned at payment
  businessDate DateTime    @map("business_date") @db.Date
  orderType    OrderType   @map("order_type")
  status       OrderStatus @default(UNPAID)
  cashierId    String      @map("cashier_id")
  cashier      User        @relation(fields: [cashierId], references: [id])
  shiftId      String      @map("shift_id")
  shift        Shift       @relation(fields: [shiftId], references: [id])
  totalAmount  Int         @map("total_amount")
  note         String?
  paidAt       DateTime?   @map("paid_at")
  items        OrderItem[]
  payments     Payment[]
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")
  @@unique([businessDate, dailySeq])
  @@unique([businessDate, queueNumber])
  @@index([businessDate, status])
  @@index([shiftId])
  @@index([cashierId])
  @@map("orders")
}

model OrderItem {
  id           String @id @default(uuid())
  orderId      String @map("order_id")
  order        Order  @relation(fields: [orderId], references: [id])
  menuId       String @map("menu_id")
  menu         Menu   @relation(fields: [menuId], references: [id])
  nameSnapshot String @map("name_snapshot")
  unitPrice    Int    @map("unit_price")
  qty          Int
  note         String?
  lineTotal    Int    @map("line_total")
  @@index([menuId])
  @@map("order_items")
}

model Payment {
  id                    String        @id @default(uuid())
  orderId               String        @map("order_id")
  order                 Order         @relation(fields: [orderId], references: [id])
  attemptNo             Int           @map("attempt_no")
  method                PaymentMethod
  status                PaymentStatus @default(PENDING)
  amount                Int
  receivedAmount        Int?          @map("received_amount")  // cash
  changeAmount          Int?          @map("change_amount")    // cash
  midtransOrderId       String?       @unique @map("midtrans_order_id") // {code}-{attemptNo}
  midtransTransactionId String?       @map("midtrans_transaction_id")
  paymentType           String?       @map("payment_type")     // qris, gopay, bank_transfer, …
  snapToken             String?       @map("snap_token")
  snapExpiresAt         DateTime?     @map("snap_expires_at")
  rawPayload            Json?         @map("raw_payload")
  failureReason         String?       @map("failure_reason")
  flaggedForRefund      Boolean       @default(false) @map("flagged_for_refund")
  paidAt                DateTime?     @map("paid_at")
  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")
  @@unique([orderId, attemptNo])
  @@map("payments")
}

model CalendarMark {
  id   String   @id @default(uuid())
  date DateTime @db.Date
  type MarkType
  name String?  // required for EVENT
  @@unique([date])
  @@map("calendar_marks")
}

model Setting {
  key   String @id
  value Json
  @@map("settings")
}
```

`Setting` holds one key today: `sundayOff` (`{ "enabled": boolean }`).

Migrations are real (`prisma migrate dev` / `migrate deploy`), not `db push`. Multi-step writes
(order + items, payment + status change) run inside `prisma.$transaction`.

## 5. Business rules (ported from the mockup, not reinvented)

### 5.1 Pricing

```
priceOf(menu):
  if menu is a bundle:
    gross = Σ priceOf(component) * component.qty
    return round(gross * (1 - discountPercent / 100) / 100) * 100   // nearest 100 rupiah
  return menu.price
```

- Bundles are identified by `Category.isBundle`, never by matching an id.
- A bundle's price is always derived, never stored, so a component price change flows through.
- Components must not be bundles; validated on write.
- Soft-deleted menus (`deletedAt`) are excluded from pricing, listing and ordering.
- Order items snapshot `unitPrice`, `nameSnapshot` and `lineTotal`, so later menu edits never
  rewrite history.

### 5.2 Menus ordering

`rank` (best seller) → category `sortOrder` → `name` compared with `localeCompare('id')`. The
client keeps this as `sortMenus`; the API returns `rank` and `sortOrder` on each menu so the
ordering is reproducible without a second call.

### 5.3 Best sellers

Top 3 menus by total quantity across all categories over the trailing 30 days including today,
counting only paid orders. Suppressed entirely while history spans fewer than 30 days
(`daysBetween(firstPaidOrderDate, today) + 1 >= 30`). Served by `GET /api/menus/best-sellers`
as `{ ranked: [{ id, qty, rank }], hasEnoughHistory, dataDays }`. No demo override.

### 5.4 Order numbers

- `code`: `TRX-{YYYYMMDD}-{seq4}`, sequence per business date, assigned at creation.
- `queueNumber`: three-digit zero-padded, sequence per business date, assigned **at payment**,
  so abandoned unpaid orders never consume a number.
- Both are allocated inside the creating transaction as `MAX + 1` for the business date, with the
  unique constraints above as the real guard; a `P2002` conflict retries the allocation (max 5).
  Postgres treats multiple `NULL`s as distinct, so unpaid orders do not collide on `queueNumber`.

### 5.5 Business date

`businessDateOf(instant)` = calendar date of `instant` in `Asia/Jakarta`, computed with
`Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })`. Rollover is midnight WIB — the same
rule the mockup's day grouping already had.

### 5.6 Status flow

`UNPAID → PROCESSING → READY → COMPLETED`, plus `UNPAID → CANCELLED`. Enforced in a single
service function; any other transition is rejected with `409`. An order becomes `PROCESSING`,
gets its queue number, and starts counting as a sale only when payment is confirmed. Only
`PROCESSING`, `READY` and `COMPLETED` orders exist on the Pesanan Kasir board.

### 5.7 Cash

`receivedAmount >= totalAmount`, otherwise `400`. `changeAmount = receivedAmount - totalAmount`;
both are stored. Payment is immediately `PAID`.

### 5.8 Shifts

A `Shift` is an open session for one cashier: created on login, closed on logout. Several shifts
may be open for the same cashier at once (multiple devices, overlapping shift windows are
allowed by design).

`ensureOpenShift(cashierId)` — called on login and on order creation:

1. If the cashier has an open shift whose `businessDate` equals the current business date, reuse it.
2. Otherwise close every older open shift of that cashier with `endedAt` = end of its business date
   and create a new shift.

This makes a forgotten logout self-healing, with no scheduler. Logout closes the cashier's open
shifts for the current business date.

Shift label for display: `startedAt` before 15:00 WIB → "Shift 1", otherwise "Shift 2" (the
mockup's boundary). A cashier can therefore appear with more than one shift on a day, which the
shift API returns as a list.

## 6. API

Base path `/api`. All input validated with Zod. One error handler, shape
`{ success: false, error: { code, message } }`; success is `{ success: true, data }`. JWT lives in
an httpOnly cookie, so no token handling in the frontend and no CORS in production.

### 6.1 Auth

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/auth/cashiers` | public | `[{ id, name }]` of active cashiers only |
| POST | `/auth/cashier/login` | public | `{ cashierId, pin }`; opens shift; sets cookie |
| POST | `/auth/owner/login` | public | `{ username, password }` |
| POST | `/auth/logout` | any | closes open shifts, clears cookie |
| GET | `/auth/me` | any | `{ id, name, role }` |

Both login endpoints are rate limited. Five consecutive wrong PINs lock that cashier for 15
minutes; the counter resets on success.

### 6.2 Cashiers (owner)

`GET /api/cashiers`, `POST /api/cashiers` (name + PIN), `PATCH /api/cashiers/:id` (name, active),
`POST /api/cashiers/:id/pin` (set or reset PIN). Deactivation replaces deletion so shift and order
history stays intact.

### 6.3 Categories and menus

| Method | Path | Access |
|---|---|---|
| GET | `/categories` | any (includes menu counts) |
| POST / PATCH / DELETE | `/categories/:id` | owner |
| GET | `/menus?categoryId=` | any (computed prices, components, rank, sortOrder) |
| POST / PATCH / DELETE | `/menus/:id` | owner |
| GET | `/menus/best-sellers` | any |

Category delete is rejected while it has menus. A category rename is allowed. Menu delete is soft
and is rejected while the menu is a component of any bundle. Bundles accept components with
quantities and a discount percent; components must not be bundles.

### 6.4 Orders

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/orders` | cashier | body `{ items: [{ productId, qty, note }], orderType, note? }`; server prices everything |
| GET | `/orders?businessDate=&status=` | any | board; `businessDate` defaults to today WIB |
| GET | `/orders/:id` | any | includes items, payments, queue, receipt fields |
| PATCH | `/orders/:id/status` | any | `{ status }`; single transition service |
| POST | `/orders/:id/cancel` | cashier | only from `UNPAID` |

The client never sends prices, totals or statuses that the server trusts.

### 6.5 Payments

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/orders/:id/payments/cash` | cashier | `{ received }`; validates, computes change, marks paid |
| POST | `/orders/:id/payments/midtrans` | cashier | Snap token; reuses a pending, unexpired token |
| GET | `/orders/:id/payment` | any | polling endpoint; triggers a server-side status check when still pending |
| POST | `/webhooks/midtrans` | public | signature-verified |
| GET | `/payments/config` | any | `{ clientKey, isProduction }` for snap.js |

### 6.6 Calendar

`GET /api/calendar?month=YYYY-MM` returns marks for the month, including derived Sunday marks
(`{ date, type: 'LIBUR', auto: true }`) when the `sundayOff` setting is on. `POST /api/calendar/marks`
accepts future dates only. `DELETE /api/calendar/marks/:id` refuses auto marks (they are never
stored). `GET`/`PUT /api/calendar/sunday-off` reads and writes the setting.

### 6.7 Reports

All aggregation happens in SQL (Prisma `groupBy` or `$queryRaw`); rows are never pulled into Node
to be summed. Only paid orders count. Response shapes mirror what the current components consume.

| Path | Shape |
|---|---|
| `/reports/summary?from&to` | `{ count, qty, total }` |
| `/reports/daily?days=30` | `[{ label, title, value, hl }]` — day-of-month label, `"13 Oktober"` title, brand-red highlight for today |
| `/reports/monthly?months=6` | `[{ label, title, value, hl }]` — short and long month names |
| `/reports/all-time` | `{ count, qty, total, daysWithSales, avgPerDay }` |
| `/reports/weekly` | `{ count, qty, total, from, to }` — Monday-start week |
| `/reports/top-cashiers?month` | `[{ cashier, total, count, qty, shifts }]` sorted desc |
| `/reports/shifts?date` | `[{ id, label, cashier, login, logout, active, count, qty, total, orders: [...] }]` |
| `/reports/day?date` | `{ count, qty, total, shifts: [...] }` |
| `/reports/transactions` | DataTables server-side `{ draw, recordsTotal, recordsFiltered, data }` |
| `/reports/transactions.csv` | same filters, CSV download |

List endpoints are paginated where the result is unbounded. The lists that feed pickers and boards
(cashiers, categories, menus, a day's orders, a day's shifts) are naturally bounded and return
complete results; the transaction table is the one paged/tabulated surface.

`/reports/transactions` accepts `draw`, `start`, `length`, `search[value]`, `order[0][column]` and
`order[0][dir]`, plus the existing filters (`range=month|all`, `month=YYYY-MM`). Sortable and
searchable columns are whitelisted and bound as parameters; anything else falls back to the
default sort. `daysWithSales` counts days with at least one paid order — the mockup's
"Rata-rata per Hari" denominator.

## 7. Midtrans Snap

Direct HTTP against Midtrans with `fetch` (Basic auth is one header, the webhook signature is
verified by hand anyway, and tests mock HTTP either way) rather than adding `midtrans-client`.

- Client key and snap.js URL come from `MIDTRANS_IS_PRODUCTION`:
  sandbox `https://app.sandbox.midtrans.com/snap/snap.js`, production
  `https://app.midtrans.com/snap/snap.js`. The server key never leaves the backend.
- Server creates the transaction with `order_id = {code}-{attemptNo}`, `gross_amount`,
  `item_details` and an expiry of `MIDTRANS_EXPIRY_MINUTES` (default 15).
- `Σ (price × qty)` over `item_details` must equal `gross_amount` exactly, so a bundle is a single
  line item at its final price. Item names are truncated to Midtrans' limit (50 chars).
- Each attempt is its own `Payment` row. A pending, unexpired Snap token is reused instead of
  creating a new attempt.
- The modal flow: choose method → cash, or Midtrans. The Midtrans path fetches the token, loads
  snap.js dynamically and calls `window.snap.pay(token, {...})`. Snap callbacks update the UI only
  and never mark anything paid. After the popup resolves, the modal polls `GET /orders/:id/payment`
  until the server confirms, then shows "Pembayaran Berhasil" with the queue number. Closing the
  popup returns to the method choice with the order still unpaid.
- When polling finds a payment still pending, the server asks Midtrans for the status
  (`GET /v2/{midtransOrderId}/status`), throttled to at most once every few seconds per payment.
  This covers missed webhooks and local development without a tunnel.
- Webhook: `signature_key == SHA512(order_id + status_code + gross_amount + serverKey)`, using
  `gross_amount` exactly as received, compared in constant time. The payment is located by
  `midtransOrderId` and its recorded amount must match. Duplicate and out-of-order notifications
  are idempotent; the raw payload is stored as JSON on the Payment.
- Status mapping: `pending` → `PENDING`; `settlement`/`capture` with fraud `accept` → `PAID`;
  `deny`/`cancel` → `CANCELLED`; `expire` → `EXPIRED`; `failure` → `FAILED`; `refund` →
  recorded and flagged for manual handling; a fraud `challenge` stays `PENDING` and is logged.
- If the cashier switches to cash or cancels while a Snap transaction is live, it is cancelled
  through Midtrans so it cannot be paid twice. If a settlement still arrives for an order already
  paid another way, the notification is recorded, the order is not completed twice, and
  `flaggedForRefund` is set with an error log.
- Documented in the README: exposing the webhook locally with cloudflared or ngrok, and where the
  Payment Notification URL is set in the Midtrans dashboard.

## 8. Frontend

### 8.1 Structure

```
src/
  api/client.js          fetch wrapper: credentials, error shape, one place for base URL
  api/hooks/*.js         per-domain TanStack Query hooks (menus, orders, payments, reports, calendar, cashiers)
  context/AuthContext.jsx    /auth/me, role, login/logout
  context/CartContext.jsx    in-progress order, persisted in sessionStorage
  lib/labels.js          the single place mapping API enums to Indonesian labels
  lib/csv.js             client-side CSV export for the client-side tables
  pages/, components/    existing files, revised
```

Removed: `store.jsx`, `selectors.js`, `data.js` (dummy data and the demo history generator),
`OnlineOrders.jsx`, `BarChart.jsx`. `utils.js` stays for presentation (`rupiah`, `rupiahShort`,
date formatting, `useNow` for display only). Presentational helpers `statusLabel`, `statusTone`
and `sortMenus` stay. No dead code: the client-side selectors are deleted once the API serves
them.

Styling stays as it is: `index.css` and its existing classes are the single source of style. No
Tailwind, no UI kit. The docs' Tailwind references are corrected in `docs/`.

### 8.2 Revisions to apply

1. **Cashier navigation** — `CashierLayout` gains "Buat Pesanan" as its first item pointing at
   `/kasir` with exact-match active state, so the POS is reachable after opening another screen.
   The cart moves out of `Pos`'s local state into `CartContext` persisted in sessionStorage, so an
   in-progress order survives navigation. It is cleared after a successful payment or "Kosongkan".
2. **Pesanan Online removed** — page, route, nav item, `PLATFORMS`, `DRIVERS`, the simulate
   function, `channel`/`driver`/`ref` fields, `sourceLabel`, the Sumber filter chips, the separate
   online queue and its styling (`.queue-big.online`, `.platform-*`, `.pcode`, `.driver`), and all
   copy mentioning online/GoFood/GrabFood/ShopeeFood (Landing, CashierSales subtitle, Shell drawer
   footer). The "Sumber" column in the three tables becomes the order type (Makan di tempat /
   Takeaway). The database has no channel concept.
3. **Owner menu "Semua" chip** — first chip, selected by default, showing the total menu count and
   listing every menu in the POS "Semua" order (category order, best sellers pinned). While it is
   active, "Tambah menu" defaults to the first category, and saving keeps the current filter.
4. **Chart.js** — `BarChart.jsx` is replaced by a Chart.js bar chart via `react-chartjs-2`,
   registering only the components used. Daily (last 30 days) and monthly (last 6 months) modes,
   the current day or month in the brand red, tooltips with the full label plus rupiah, short
   rupiah axis ticks, responsive sizing. Colors are read from the existing CSS variables.
5. **DataTables** — CashierSales, OwnerSales and the per-shift detail table in OwnerPerformance use
   DataTables (`datatables.net` plus the official React wrapper) for sorting, search, paging and
   page length. Indonesian language strings; styled to match the mockup rather than the default
   theme; custom cells (badges, queue chip) rendered through the wrapper's supported mechanism.
   Money and date/time columns show formatted values but sort on raw values (integer rupiah, ISO
   timestamp). CashierSales and the per-shift tables use client-side processing. OwnerSales uses
   server-side processing against `/reports/transactions`, keeping the "1 bulan / Selama ini"
   toggle and the month switcher as request filters, with the custom pagination removed. Each of
   the four tables gets a CSV export. Pesanan Kasir stays a card board. Known cost: DataTables
   pulls jQuery (~30 kB gzipped) plus the core (~25 kB), and Chart.js ~70 kB; the three DataTables
   routes are lazy-loaded so the POS bundle stays small.
6. **States and guards** — loading, error and empty states on every data screen; role-based route
   guards on both API and routes; the "Data diperbarui otomatis" pill and the order board poll via
   TanStack Query `refetchInterval`. No websockets.

### 8.3 Receipt

One customer nota only — no kitchen copy, no "2×". The print stylesheet (`72mm`), the layout and
the "Cetak nota" button are kept; `Receipt` loses the kitchen variant and the platform tag line
that only existed for online orders. Order data is fetched from the API.

## 9. Demo data and seeding

`npm run seed` seeds the base data: the owner from env, the three mockup cashiers (`Siti Rahma`,
`Budi Santoso`, `Dewi Lestari`, PIN `1234`), the four categories in mockup order with `Menu Paket`
marked `isBundle`, and the 18 menus plus 3 bundles with their components and discounts.

`npm run seed:demo` generates 120 days of plausible history — creating real cashiers' shifts and
paid orders with the mockup's weighting — so charts, best sellers and performance views can be
reviewed. It refuses to run when `NODE_ENV=production`, and it is the only remaining generator.

Every demo affordance is removed: `resetDemo` and the Landing reset button, "mockup/dummy" copy,
the "demo: ketik 4 angka apa saja" PIN hint, the "Demo: data < 1 bulan" toggle and the
`demoShort` hack, the fake QR, the "Simulasikan: pembayaran diterima" button, and the online-order
simulator.

## 10. Backend architecture

Express (already deployed, health endpoint and SPA serving in place, minimal churn). Layers:
routes → controllers → services → Prisma. Zod on all input, one centralized error handler with a
consistent JSON shape, env validated at startup, pino logging, helmet, CORS restricted to the
frontend origin, rate limiting on login. No `any`; the backend is TypeScript with `strict`.

## 11. Testing

Vitest + Supertest against a real Postgres test database in Docker:

- order totals and bundle price calculation, including the round-to-100 rule
- status transitions, legal and illegal
- concurrent order-code and queue-number generation
- webhook signature, idempotency, amount mismatch
- cash change calculation and `received < total` rejection
- auth, role guards and PIN lockout
- report aggregation across the 00:00 WIB boundary (17:00 UTC)

Midtrans HTTP is mocked in tests; the sandbox is used for manual verification.

## 12. Security

No secrets in the repo. Client-sent prices, totals and "paid" claims are never trusted. The webhook
endpoint is public but signature-verified in constant time. No stack traces in production
responses. DataTables server-side parameters are whitelisted and parameterized. PINs and passwords
are hashed. The Midtrans server key never reaches the frontend.

## 13. Decisions taken with the owner

| # | Question | Decision |
|---|---|---|
| 1 | Owner login | Single owner account, seeded from env, no owner-management UI |
| 2 | Cashier management | Owner screen to add, rename, activate/deactivate and reset PIN |
| 3 | Shift rules | Multiple concurrent shifts and devices allowed; self-healing `ensureOpenShift`; no forced logout |
| 4 | Order-level note | Added to the POS bill |
| 5 | Void/refund of paid orders | Not needed |
| 6 | Business day rollover | Midnight WIB |
| 7 | Bundle whose component is deleted | Deleting a menu used by a bundle is blocked |
| 8 | Receipt | One customer nota, no kitchen copy, no "2×" |
| 9 | CSV export | Added to the four DataTables |
| 10 | Frontend language | Stays JS/JSX with TanStack Query |
| 11 | Transaction id format | Mockup format `TRX-YYYYMMDD-NNNN`; `KKA` dropped |
| 12 | Serving model | Express keeps serving the built frontend; same origin |
| 13 | Demo history | Dev-only generator, 120 days |
| 14 | PIN policy | Seed `1234`; 5 failures → 15 minute lock |
| 15 | Styling and docs | No Tailwind — keep `index.css`; `docs/` rewritten to match this spec |

## 14. Delivery phases

0. Discovery and plan (this spec and the implementation plan).
1. Mockup revisions 1–3 on the existing mock store (UI only).
2. Foundation: backend scaffold, Prisma schema and migrations, seed, auth, shifts, API client,
   route guards, `CLAUDE.md`.
3. Menu, categories, bundles, best sellers, plus frontend integration.
4. Orders, cash payment, Pesanan Kasir board, CashierSales (client-side DataTables).
5. Midtrans Snap, webhook, polling, cancel and reconciliation.
6. Calendar, reports, dashboard, performance, OwnerSales (Chart.js + server-side DataTables),
   receipt.
7. Tests, hardening, README, docs rewrite, final grep for demo and online remnants.

Each phase ends with typecheck, lint, build, tests, a manual run-through of the affected flow, and
a conventional commit.
