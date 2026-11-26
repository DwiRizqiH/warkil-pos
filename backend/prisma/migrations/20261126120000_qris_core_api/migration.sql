-- Snap fields were never used; Core API QRIS returns the QR string and its expiry directly.
ALTER TABLE "payments" DROP COLUMN "snap_token";
ALTER TABLE "payments" RENAME COLUMN "snap_expires_at" TO "expires_at";
ALTER TABLE "payments" ADD COLUMN "qr_string" TEXT;
