import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../lib/respond.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCategory, deleteCategory, updateCategory } from '../services/menus.js';

const categoryBody = z.object({ name: z.string().trim().min(1).max(60) });
const createBody = categoryBody.extend({ isBundle: z.boolean().optional() });
const idParams = z.object({ id: z.string().min(1) });

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth, requireRole('OWNER'));

categoriesRouter.post('/', validate({ body: createBody }), async (req, res, next) => {
  try {
    ok(res, await createCategory(req.body), 201);
  } catch (err) {
    next(err);
  }
});

categoriesRouter.patch('/:id', validate({ params: idParams, body: categoryBody }), async (req, res, next) => {
  try {
    ok(res, await updateCategory(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

categoriesRouter.delete('/:id', validate({ params: idParams }), async (req, res, next) => {
  try {
    await deleteCategory(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
