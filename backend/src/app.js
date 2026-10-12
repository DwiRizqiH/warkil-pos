import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiRouter } from './routes/index.js';
import { serveStatic } from './static.js';

export const TRUST_PROXY = 'loopback';

export function createApp() {
  const app = express();

  // nginx sits on the same loopback, so only that hop is trusted and req.ip stays the real client address.
  app.set('trust proxy', TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));

  app.use('/api', apiRouter);
  app.use('/api', notFoundHandler);
  serveStatic(app);
  app.use(errorHandler);

  return app;
}
