import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/respond.js';
import { unauthorized } from '../lib/errors.js';
import { requireAuth, SESSION_COOKIE } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginCashier, loginOwner } from '../services/auth.js';
import { closeAllOpenShifts } from '../services/shifts.js';

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

// A 4-digit PIN is 10,000 combinations: per-IP limiting blunts mass guessing, per-account
// lockout handles a targeted run at one cashier.
export const createLoginLimiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Coba lagi nanti.' } },
  });

const loginLimiter = createLoginLimiter(env.NODE_ENV === 'test' ? 1000 : 10);

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export const authRouter = Router();

// Public: the cashier login screen only needs names to choose from.
authRouter.get('/cashiers', async (_req, res, next) => {
  try {
    ok(res, await prisma.user.findMany({ where: { role: 'CASHIER', isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }));
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/owner/login',
  loginLimiter,
  validate({ body: z.object({ username: z.string().min(1), password: z.string().min(1) }) }),
  async (req, res, next) => {
    try {
      const { token, user } = await loginOwner(req.body.username, req.body.password);
      setSessionCookie(res, token);
      ok(res, { user });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/cashier/login',
  loginLimiter,
  validate({ body: z.object({ cashierId: z.string().min(1), pin: z.string().regex(/^\d{4}$/, 'PIN 4 digit') }) }),
  async (req, res, next) => {
    try {
      const { token, user, shiftId } = await loginCashier(req.body.cashierId, req.body.pin);
      setSessionCookie(res, token);
      ok(res, { user, shiftId });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.id },
      select: { id: true, role: true, name: true, isActive: true },
    });
    if (!user || !user.isActive) throw unauthorized('Sesi tidak valid atau sudah berakhir');
    ok(res, { user: { id: user.id, role: user.role, name: user.name }, shiftId: req.auth.shiftId ?? null });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    if (req.auth.role === 'CASHIER') await closeAllOpenShifts(req.auth.id);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
