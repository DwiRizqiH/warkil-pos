import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3100),
  HOST: z.string().min(1).default('127.0.0.1'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'minimal 32 karakter'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  MIDTRANS_SERVER_KEY: z.string().default(''),
  // Since 28 Oct 2026 Midtrans signs notifications with this key instead of the server key;
  // the server key stays in use for Core API calls.
  MIDTRANS_SIGNATURE_SECRET: z.string().default(''),
  // Overrides the dashboard notification URL for every charge, so the callback keeps working
  // even when the dashboard setting cannot be saved.
  MIDTRANS_NOTIFICATION_URL: z.string().default(''),
  MIDTRANS_CLIENT_KEY: z.string().default(''),
  // z.coerce.boolean() reads the string "false" as true; the enum forces an explicit value.
  MIDTRANS_IS_PRODUCTION: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  MIDTRANS_EXPIRY_MINUTES: z.coerce.number().int().positive().default(15),
});

export function parseEnv(source = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Konfigurasi environment tidak valid — ${detail}`);
  }
  return result.data;
}

export const env = parseEnv();
