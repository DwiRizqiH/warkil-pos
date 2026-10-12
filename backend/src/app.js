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

// Dipakai tes dan server.js — satu-satunya cara membangun app, jadi setelan
// trust proxy ikut diuji oleh setiap tes API.
export function createApp() {
  const app = express();

  // nginx ada di loopback yang sama dengan Node. 'loopback' mempercayai hanya hop
  // itu, jadi req.ip = alamat asli klien, bukan X-Forwarded-For paling kiri yang
  // bisa dipalsukan klien. Dipakai rate-limit login dan pencatatan IP.
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
