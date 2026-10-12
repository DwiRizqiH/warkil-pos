import 'dotenv/config';

// Sementara: nilai mentah dengan default. Task 2 menggantinya dengan validasi Zod
// (parseEnv) supaya konfigurasi yang salah ketik gagal saat start, bukan saat dipakai.
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  HOST: process.env.HOST ?? '127.0.0.1',
  PORT: Number(process.env.PORT ?? 3100),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
};
