import { Router } from 'express';
import { z } from 'zod';
import { forbidden } from '../lib/errors.js';
import { ok } from '../lib/respond.js';
import { businessDate } from '../lib/wib.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPaidOrder, ordersForDate } from '../services/orders.js';

const lineSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(99),
  note: z.string().trim().max(200).optional(),
});

const createBody = z.object({
  orderType: z.enum(['dine', 'take']),
  payment: z.enum(['Cash', 'QRIS']),
  receivedAmount: z.number().int().nonnegative().optional(),
  note: z.string().trim().max(200).optional(),
  items: z.array(lineSchema).min(1).max(50),
});

const listQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get('/', validate({ query: listQuery }), async (req, res, next) => {
  try {
    const today = businessDate();
    // Cashiers only need today's queue; historical sales stay owner-only.
    if (req.auth.role !== 'OWNER' && req.query.date && req.query.date !== today) {
      next(forbidden('Kasir hanya dapat melihat pesanan hari ini'));
      return;
    }
    ok(res, await ordersForDate(req.auth.role === 'OWNER' ? req.query.date : today));
  } catch (err) {
    next(err);
  }
});

ordersRouter.post('/', requireRole('CASHIER'), validate({ body: createBody }), async (req, res, next) => {
  try {
    ok(res, await createPaidOrder({ cashier: req.auth, input: req.body }), 201);
  } catch (err) {
    next(err);
  }
});
