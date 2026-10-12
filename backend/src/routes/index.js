import { Router } from 'express';
import { ok } from '../lib/respond.js';
import { authRouter } from './auth.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  ok(res, { status: 'ok', uptime: process.uptime() });
});

apiRouter.use('/auth', authRouter);
