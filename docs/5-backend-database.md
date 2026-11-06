# Skema Database — Prisma Aktual

Sumber kebenaran skema adalah `backend/prisma/schema.prisma`. Database provider adalah
PostgreSQL. Nama enum pada Prisma ditulis kapital; pemetaan nama tabel/kolom ditunjukkan lewat
`@@map` dan `@map`.

## 1. Enum

| Enum | Nilai |
|---|---|
| `Role` | `OWNER`, `CASHIER` |
| `OrderStatus` | `UNPAID`, `PROCESSING`, `READY`, `COMPLETED`, `CANCELLED` |
| `OrderType` | `DINE_IN`, `TAKEAWAY` |
| `PaymentMethod` | `CASH`, `QRIS`, `MIDTRANS` |
| `PaymentStatus` | `PENDING`, `PAID`, `FAILED`, `EXPIRED`, `CANCELLED` |
| `MarkType` | `LIBUR`, `EVENT` |

## 2. Model

| Model / tabel | Kolom dan perilaku utama |
|---|---|
| `User` / `users` | `name`, `role`, optional `username`, `passwordHash`, `pinHash`, aktivasi, PIN failure/lockout; relasi ke shifts dan orders |
| `Shift` / `shifts` | `cashierId`, `businessDate` (DATE), waktu mulai/selesai; relasi ke kasir dan pesanan |
| `Category` / `categories` | `name`, `sortOrder`, `isBundle`; relasi ke menu |
| `Menu` / `menus` | `categoryId`, `name`, optional `emoji`/`imageUrl`, optional integer `price`, optional `discountPercent`, soft-delete `deletedAt` |
| `MenuComponent` / `menu_components` | Komposisi paket: `bundleId`, `componentId`, `qty`; primary key gabungan |
| `Order` / `orders` | `code`, `dailySeq`, optional `queueNumber`, tanggal bisnis, tipe/status, kasir/shift, integer `totalAmount`, `note`, `paidAt` |
| `OrderItem` / `order_items` | Relasi order/menu, snapshot nama/harga, `qty`, catatan, `lineTotal` |
| `Payment` / `payments` | Relasi order, nomor percobaan, metode/status, integer `amount`, uang diterima/kembalian cash, referensi Midtrans, payload dan status pembayaran |
| `CalendarMark` / `calendar_marks` | Tanggal unik, tipe `LIBUR`/`EVENT`, nama opsional |
| `Setting` / `settings` | `key` dan nilai JSON |

## 3. Relasi dan Constraint Penting

- `User` memiliki banyak `Shift` dan `Order`.
- `Shift` memiliki banyak `Order`.
- `Category` memiliki banyak `Menu`.
- `Menu` memiliki relasi komposisi paket melalui `MenuComponent` yang menunjuk ke menu induk
  dan komponen.
- `Order` memiliki banyak `OrderItem` dan `Payment`.
- `Menu` dan `OrderItem` berelasi; item menyimpan snapshot nama dan harga saat transaksi.
- Kode order unik; `dailySeq` unik per `businessDate`; `queueNumber` unik per tanggal bila
  bernilai.
- `Payment.attemptNo` unik per order, dan `midtransOrderId` unik bila diisi.
- Tanggal `CalendarMark` unik.

## 4. Index Aktual

Skema mendefinisikan index pada:

- `Shift(cashierId, businessDate)` dan `Shift(businessDate)`.
- `Category(sortOrder)`.
- `Menu(categoryId)`.
- `Order(businessDate, status)`, `Order(shiftId)`, dan `Order(cashierId)`.
- `OrderItem(menuId)`.

Unique constraints dan primary keys seperti pada bagian 3 juga dibuat di database.

## 5. Catatan Konsistensi Implementasi

- Model memiliki beberapa field/status pembayaran untuk dukungan lebih luas, tetapi alur
  `POST /api/orders` saat ini menyimpan pembayaran langsung sebagai `PAID`, baik untuk Cash
  maupun QRIS mock.
- API yang aktif belum melakukan CRUD pada model `Menu`, `Category`, `CalendarMark`, dan
  `Setting`.
- Model `Payment` mendukung percobaan dan field Midtrans, tetapi tidak membuktikan bahwa
  integrasi gateway sudah berjalan.
- Nilai uang pada model aktif adalah integer, bukan `Decimal`.
