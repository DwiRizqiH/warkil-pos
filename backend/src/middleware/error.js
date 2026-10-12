import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { AppError } from '../lib/errors.js';

const fail = (res, status, code, message) => res.status(status).json({ success: false, error: { code, message } });

export const notFoundHandler = (_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan'));
};

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return fail(res, 409, 'CONFLICT', 'Data sudah ada');
    if (err.code === 'P2025') return fail(res, 404, 'NOT_FOUND', 'Data tidak ditemukan');
  }
  logger.error({ err }, 'kesalahan tak terduga');
  // Pesan mentah tidak pernah dikirim ke klien di production — bisa memuat detail query.
  const message = process.env.NODE_ENV === 'production' ? 'Terjadi kesalahan pada server' : String(err);
  return fail(res, 500, 'INTERNAL', message);
}
