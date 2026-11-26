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

const WEBHOOK_PATH = '/api/payments/midtrans/notification';
const MIDTRANS_DASHBOARD_ORIGINS = new Set([
  'https://dashboard.sandbox.midtrans.com',
  'https://dashboard.midtrans.com',
]);

export function createApp() {
  const app = express();

  // nginx sits on the same loopback, so only that hop is trusted and req.ip stays the real client address.
  app.set('trust proxy', TRUST_PROXY);
  app.disable('x-powered-by');

  // Menu photos are pasted as remote https URLs, so the default img-src would blank them.
  app.use(helmet({ contentSecurityPolicy: { directives: { 'img-src': ["'self'", 'data:', 'https:'] } } }));
  app.use(pinoHttp({ logger }));
  // Menu photos arrive as data URLs from the owner form, so the default 100kb body is too small.
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  // The Midtrans dashboard tests the URL from the browser, so that one route needs a CORS
  // exception; webhook calls themselves are server-to-server and carry no Origin.
  app.use(
    cors((req, callback) => {
      if (req.path === WEBHOOK_PATH) {
        const origin = req.header('Origin');
        callback(null, {
          origin: MIDTRANS_DASHBOARD_ORIGINS.has(origin) ? origin : false,
          credentials: false,
        });
        return;
      }
      callback(null, { origin: env.FRONTEND_ORIGIN, credentials: true });
    })
  );

  app.use('/api', apiRouter);
  app.use('/api', notFoundHandler);
  serveStatic(app);
  app.use(errorHandler);

  return app;
}
