import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../lib/respond.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createMenu, deleteMenu, menuCatalog, updateMenu } from '../services/menus.js';

const menuBody = z.object({
  name: z.string().trim().min(1).max(80),
  cat: z.string().min(1),
  emoji: z.string().trim().max(16).optional(),
  image: z.string().max(2_000_000).nullable().optional(),
  price: z.number().int().positive().optional(),
  discount: z.number().int().min(0).max(100).optional(),
  items: z
    .array(z.object({ id: z.string().min(1), qty: z.number().int().min(1).max(99) }))
    .max(50)
    .optional(),
});

const patchBody = menuBody.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Tidak ada perubahan',
});

const idParams = z.object({ id: z.string().min(1) });

export const menusRouter = Router();

menusRouter.use(requireAuth);

menusRouter.get('/', async (_req, res, next) => {
  try {
    ok(res, await menuCatalog());
  } catch (err) {
    next(err);
  }
});

menusRouter.post('/', requireRole('OWNER'), validate({ body: menuBody }), async (req, res, next) => {
  try {
    ok(res, await createMenu(req.body), 201);
  } catch (err) {
    next(err);
  }
});

menusRouter.patch(
  '/:id',
  requireRole('OWNER'),
  validate({ params: idParams, body: patchBody }),
  async (req, res, next) => {
    try {
      ok(res, await updateMenu(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  }
);

menusRouter.delete('/:id', requireRole('OWNER'), validate({ params: idParams }), async (req, res, next) => {
  try {
    await deleteMenu(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
