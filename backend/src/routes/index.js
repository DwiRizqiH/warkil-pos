import { Router } from 'express';
import { ok } from '../lib/respond.js';
import { authRouter } from './auth.js';
import { cashiersRouter } from './cashiers.js';
import { categoriesRouter } from './categories.js';
import { menusRouter } from './menus.js';
import { ordersRouter } from './orders.js';
import { paymentsRouter } from './payments.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  ok(res, { status: 'ok', uptime: process.uptime() });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/cashiers', cashiersRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/menus', menusRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/payments', paymentsRouter);
