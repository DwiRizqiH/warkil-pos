import { Router } from 'express';
import { z } from 'zod';
import { conflict, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/respond.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { hashSecret } from '../services/auth.js';

const pinSchema = z.string().regex(/^\d{4}$/, 'PIN harus 4 digit');
const idParam = z.object({ id: z.string().min(1) });
const publicFields = { id: true, name: true, isActive: true, createdAt: true };

export const cashiersRouter = Router();

cashiersRouter.use(requireAuth, requireRole('OWNER'));

cashiersRouter.get('/', async (_req, res, next) => {
  try {
    ok(res, await prisma.user.findMany({ where: { role: 'CASHIER' }, orderBy: { name: 'asc' }, select: publicFields }));
  } catch (err) {
    next(err);
  }
});

cashiersRouter.post('/', validate({ body: z.object({ name: z.string().trim().min(1).max(60), pin: pinSchema }) }), async (req, res, next) => {
  try {
    const existing = await prisma.user.findFirst({ where: { role: 'CASHIER', name: req.body.name } });
    if (existing) throw conflict('Nama kasir sudah dipakai');
    const cashier = await prisma.user.create({
      data: { role: 'CASHIER', name: req.body.name, pinHash: await hashSecret(req.body.pin) },
      select: publicFields,
    });
    ok(res, cashier, 201);
  } catch (err) {
    next(err);
  }
});

// Cashiers are deactivated, never deleted: their shifts and orders still point at this row.
cashiersRouter.patch(
  '/:id',
  validate({
    params: idParam,
    body: z.object({ name: z.string().trim().min(1).max(60).optional(), isActive: z.boolean().optional() }),
  }),
  async (req, res, next) => {
    try {
      const cashier = await prisma.user.findFirst({ where: { id: req.params.id, role: 'CASHIER' } });
      if (!cashier) throw notFound('Kasir tidak ditemukan');
      await prisma.user.update({ where: { id: cashier.id }, data: { name: req.body.name, isActive: req.body.isActive } });
      ok(res, await prisma.user.findUniqueOrThrow({ where: { id: cashier.id }, select: publicFields }));
    } catch (err) {
      next(err);
    }
  }
);

cashiersRouter.post('/:id/pin', validate({ params: idParam, body: z.object({ pin: pinSchema }) }), async (req, res, next) => {
  try {
    const cashier = await prisma.user.findFirst({ where: { id: req.params.id, role: 'CASHIER' } });
    if (!cashier) throw notFound('Kasir tidak ditemukan');
    await prisma.user.update({
      where: { id: cashier.id },
      data: { pinHash: await hashSecret(req.body.pin), failedPinCount: 0, pinLockedUntil: null },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
