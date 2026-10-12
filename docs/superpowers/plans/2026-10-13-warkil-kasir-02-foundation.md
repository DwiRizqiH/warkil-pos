# Warkil-Kasir — Phase 2 (Backend Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `backend/` into a real Express + Prisma REST API (plain JavaScript ESM) with a PostgreSQL schema, auth (owner login + cashier PIN), shifts, seeded data, and wire the frontend to it with an API client, TanStack Query and role guards.

**Architecture:** Routes → controllers → services → Prisma. Zod validates every input at the route boundary; one error handler renders every failure in the same JSON shape. Money is integer rupiah; business dates come from Asia/Jakarta helpers, never from `Date` local getters. The backend keeps serving `frontend/dist`, so the deployed topology (pm2 + nginx + loopback proxy) is unchanged, and it runs its own source — no build step.

**Tech Stack:** Node 22, JavaScript ESM (`"type": "module"`), Express 4, Prisma 6 + PostgreSQL 16, Zod, pino, helmet, cors, cookie-parser, express-rate-limit, jsonwebtoken, bcryptjs, Vitest + Supertest, ESLint. Frontend adds @tanstack/react-query.

**Spec:** `docs/superpowers/specs/2026-10-13-warkil-kasir-design.md` (§3 layout, §4 Prisma model, §5 business rules, §6 API, §9 seeding, §10 architecture, §11 testing, §12 security). Where the spec says TypeScript, this plan's plain-JS decision wins — the user chose JavaScript ESM for the backend.

## Global Constraints

- Backend is JavaScript ESM. No TypeScript, no `.ts` files, no `tsc`, no `dist/`. `node src/server.js` runs exactly what is in the repo.
- Frontend stays JS/JSX. No Tailwind, no UI kit; the visual system lives in `frontend/src/index.css`.
- Money is integer rupiah everywhere. No floats, no `Decimal` arithmetic in JS.
- All timestamps are stored UTC; every "day" is an Asia/Jakarta day. Never use `getDate()`/`getHours()` on a `Date` for business logic.
- Express 4 (not 5) — `express-rate-limit@7` and the `req.query` mutation in the validation middleware both rely on it.
- Every async route handler is `async (req, res, next)` with `try { … } catch (err) { next(err) }`. Express 4 does not forward rejected promises, so a missing `catch` turns into a hung request.
- `prisma` is a **production** dependency because `prisma migrate deploy` runs on the VPS where devDependencies are not installed.
- No secrets in the repo. Real values live in `backend/.env` on the server; the repo carries `.env.example` only.
- Schema changes go through `prisma migrate dev` — `prisma db push` is never used.
- Endpoint paths, request bodies and response shapes come from spec §6. Where this plan names a path, it is the spec's path; if a path here disagrees with the spec, the spec wins and the task fixes the plan's copy.
- The API never returns `pinHash`, `passwordHash` or another user's `failedAttempts`.
- Error body shape is always `{ "error": { "code": string, "message": string, "details"?: unknown } }`.

## Review Focus

- A second cashier logging in on the same tablet must not inherit the previous cashier's cart — cleared on login, pinned in Task 11.
- Two logins by the same cashier in one shift must not create two open shifts; a forgotten logout must never attach the next day's orders to yesterday's shift — pinned in Task 6.
- Money rounding: a bundle discount landing between two 100-rupiah steps must round to the nearest 100, and order totals must equal the sum of stored line prices, never a recomputed price — pinned in Task 4.
- Transactions at 16:59 UTC and 17:00 UTC must land in different business days — pinned in Task 5.
- A locked account must stay locked even with the correct PIN — pinned in Task 7.
- The trust-proxy lock must survive the restructuring — the actual app is tested, not a hand-built Express instance — pinned in Task 1.

---

### Task 1: Restructure the backend into `src/` modules

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/server.js`
- Create: `backend/src/app.js`
- Create: `backend/src/static.js`
- Create: `backend/src/lib/logger.js`
- Create: `backend/src/lib/errors.js`
- Create: `backend/src/middleware/error.js`
- Create: `backend/src/routes/index.js`
- Create: `backend/vitest.config.js`
- Create: `backend/eslint.config.js`
- Delete: `backend/server.js`, `backend/test/trust-proxy.test.mjs`
- Modify: `backend/ecosystem.config.cjs`
- Modify: `.github/workflows/deploy.yml`, `deploy/deploy.sh`
- Test: `backend/src/app.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createApp(): Express` and `TRUST_PROXY = 'loopback'` in `src/app.js` — the only way tests and `server.js` build the app, so the trust-proxy setting is exercised by every API test. `apiRouter` in `src/routes/index.js` is the mount point every later task adds routers to. `logger` is a pino instance.

- [ ] **Step 1: Rewrite `backend/package.json`**

```json
{
  "name": "warkil-kasir-backend",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "description": "REST API Warkil-Kasir: kasir, pesanan, pembayaran, laporan. Juga menyajikan build statis frontend.",
  "main": "src/server.js",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "vitest run",
    "lint": "eslint .",
    "migrate": "prisma migrate dev",
    "generate": "prisma generate",
    "seed": "node prisma/seed.js",
    "seed:demo": "node prisma/seed-demo.js"
  },
  "engines": { "node": ">=20" },
  "dependencies": {
    "@prisma/client": "^6.2.1",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "pino": "^9.6.0",
    "pino-http": "^10.4.0",
    "prisma": "^6.2.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "eslint": "^9.17.0",
    "globals": "^15.14.0",
    "supertest": "^7.0.0",
    "vitest": "^2.1.8"
  }
}
```

`prisma` sits in `dependencies` on purpose: `deploy.sh` installs with `--omit=dev` and then runs `prisma migrate deploy` on the VPS.

- [ ] **Step 2: Write the failing test for the app's safety-critical behaviour**

`backend/src/app.test.js`:

```js
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp, TRUST_PROXY } from './app.js';

const app = createApp();

describe('trust proxy', () => {
  it('memakai IP klien asli di belakang nginx, bukan X-Forwarded-For palsu', async () => {
    const probe = express();
    probe.set('trust proxy', TRUST_PROXY);
    probe.get('/ip', (req, res) => res.send(req.ip));
    const res = await request(probe).get('/ip').set('X-Forwarded-For', '1.2.3.4, 203.0.113.9');
    expect(res.text).toBe('203.0.113.9');
  });

  it('app sungguhan memakai setelan itu', () => {
    expect(app.get('trust proxy')).toBe(TRUST_PROXY);
  });
});

describe('api', () => {
  it('membalas health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('membalas 404 JSON untuk endpoint yang tidak ada, bukan HTML SPA', async () => {
    const res = await request(app).get('/api/tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

`X-Forwarded-For: 1.2.3.4, 203.0.113.9` mimics nginx appending the real client address: with `trust proxy: 'loopback'` Express takes the right-most untrusted hop (`203.0.113.9`); with `true` it would take the spoofable left-most (`1.2.3.4`). That distinction is why the old `trust-proxy.test.mjs` existed. The probe app is built separately on purpose: `createApp()` installs the SPA fallback, so a route added to it afterwards would be shadowed by the wildcard whenever `frontend/dist` exists.

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npm install && npx vitest run src/app.test.js`
Expected: FAIL — `Failed to resolve import "./app.js"`.

- [ ] **Step 4: Write the modules**

`backend/src/lib/logger.js`:

```js
import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
});
```

`backend/src/static.js`:

```js
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';

// Relatif ke file ini, bukan ke cwd: pm2 dan node --watch jalan dari direktori berbeda.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');

export function serveStatic(app) {
  if (!fs.existsSync(distDir)) return;
  app.use(express.static(distDir, { index: false, immutable: true, maxAge: '1y' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}
```

`backend/src/app.js`:

```js
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
```

`backend/src/routes/index.js`:

```js
import { Router } from 'express';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
```

`backend/src/lib/errors.js`:

```js
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Belum masuk') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Tidak punya akses') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Data tidak ditemukan') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message) => new AppError(409, 'CONFLICT', message);
export const locked = (message) => new AppError(423, 'LOCKED', message);
```

`backend/src/middleware/error.js`:

```js
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { AppError } from '../lib/errors.js';

export const notFoundHandler = (_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan'));
};

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Data sudah ada' } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Data tidak ditemukan' } });
      return;
    }
  }
  logger.error({ err }, 'kesalahan tak terduga');
  // Pesan mentah tidak pernah dikirim ke klien di production — bisa memuat detail query.
  const message = process.env.NODE_ENV === 'production' ? 'Terjadi kesalahan pada server' : String(err);
  res.status(500).json({ error: { code: 'INTERNAL', message } });
}
```

`backend/src/server.js`:

```js
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const server = createApp().listen(env.PORT, env.HOST, () => {
  logger.info({ host: env.HOST, port: env.PORT }, 'api warkil-kasir siap');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      prisma.$disconnect().then(() => process.exit(0));
    });
  });
}
```

`src/config/env.js` and `src/lib/prisma.js` are written in Tasks 2 and 3, so Step 6's suite runs only after those tasks. Both are already part of this plan — do not stub them.

- [ ] **Step 5: Add the test and lint config**

`backend/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import { testEnv } from './src/test/testEnv.js';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: testEnv,
    globalSetup: ['./src/test/globalSetup.js'],
    include: ['src/**/*.test.js'],
    // Semua tes berbagi satu database uji dan mem-truncate tabel di antaranya.
    fileParallelism: false,
  },
});
```

`src/test/testEnv.js` and `src/test/globalSetup.js` arrive in Task 3. Until then, run single files with `npx vitest run src/app.test.js --config /dev/null` only if needed — normally work task by task and let the suite go green at Task 3.

`backend/eslint.config.js`:

```js
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
```

- [ ] **Step 6: Update the run and deploy pipeline**

`backend/ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: 'warkil-kasir',
      script: 'src/server.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: 3100 },
    },
  ],
};
```

`deploy/deploy.sh`:

```bash
#!/usr/bin/env bash
# Dijalankan di VPS oleh GitHub Actions setelah source di-upload.
set -euo pipefail

APP_DIR=/home/dwi/warkil-kasir
cd "$APP_DIR/backend"

npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

`.github/workflows/deploy.yml` — replace the `Test backend` step with one that generates the Prisma client first, and add a Postgres service to the job:

```yaml
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: warkil
          POSTGRES_PASSWORD: warkil
          POSTGRES_DB: warkil_kasir_test
        ports: ['5434:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 10
```

```yaml
      - name: Test backend
        working-directory: backend
        run: |
          npm ci
          npx prisma generate
          npm test
```

- [ ] **Step 7: Delete the replaced files and check the app boots**

```bash
git rm backend/server.js backend/test/trust-proxy.test.mjs
```

After Task 3 has created the missing modules, run: `cd backend && npm run dev`
Expected: `api warkil-kasir siap`, and `curl http://127.0.0.1:3100/api/health` returns `{"status":"ok",...}`.

- [ ] **Step 8: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src backend/vitest.config.js backend/eslint.config.js backend/ecosystem.config.cjs deploy/deploy.sh .github/workflows/deploy.yml
git commit -m "refactor(backend): split the server into routes, middleware and app modules"
```

---

### Task 2: Environment validation and request validation

**Files:**
- Create: `backend/src/config/env.js`
- Create: `backend/src/middleware/validate.js`
- Create: `backend/.env.example`
- Test: `backend/src/config/env.test.js`
- Test: `backend/src/middleware/validate.test.js`

**Interfaces:**
- Consumes: `AppError` (Task 1).
- Produces: `env` (validated) and `parseEnv(source)` from `src/config/env.js`; `validate({ body?, query?, params? })` returning an Express middleware that replaces the parsed values in place of the raw ones and raises `AppError(400, 'VALIDATION', …)`.

- [ ] **Step 1: Write the failing tests**

`backend/src/config/env.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://warkil:warkil@localhost:5433/warkil_kasir',
  JWT_SECRET: 'a'.repeat(32),
};

describe('parseEnv', () => {
  it('memberi default sandbox untuk Midtrans', () => {
    const env = parseEnv(base);
    expect(env.MIDTRANS_IS_PRODUCTION).toBe(false);
    expect(env.PORT).toBe(3100);
    expect(env.HOST).toBe('127.0.0.1');
  });

  it('membaca MIDTRANS_IS_PRODUCTION=false sebagai false, bukan truthy string', () => {
    expect(parseEnv({ ...base, MIDTRANS_IS_PRODUCTION: 'false' }).MIDTRANS_IS_PRODUCTION).toBe(false);
    expect(parseEnv({ ...base, MIDTRANS_IS_PRODUCTION: 'true' }).MIDTRANS_IS_PRODUCTION).toBe(true);
  });

  it('menolak konfigurasi yang kurang, dengan menyebut nama variabelnya', () => {
    expect(() => parseEnv({ JWT_SECRET: 'a'.repeat(32) })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...base, JWT_SECRET: 'pendek' })).toThrow(/JWT_SECRET/);
  });
});
```

`backend/src/middleware/validate.test.js`:

```js
import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from './validate.js';
import { errorHandler } from './error.js';

function appWith(schemas) {
  const app = express();
  app.use(express.json());
  app.post('/x', validate(schemas), (req, res) => res.json({ body: req.body }));
  app.use(errorHandler);
  return app;
}

describe('validate', () => {
  it('meneruskan body yang sudah diparse dan dikonversi', async () => {
    const app = appWith({ body: z.object({ qty: z.coerce.number().int().positive() }) });
    const res = await request(app).post('/x').send({ qty: '2' });
    expect(res.status).toBe(200);
    expect(res.body.body.qty).toBe(2);
  });

  it('membalas 400 dengan detail per field', async () => {
    const app = appWith({ body: z.object({ qty: z.number().int().positive() }) });
    const res = await request(app).post('/x').send({ qty: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(res.body.error.details[0].path).toBe('qty');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/config/env.test.js src/middleware/validate.test.js`
Expected: FAIL — cannot resolve `./env.js` and `./validate.js`.

- [ ] **Step 3: Write `env.js`**

```js
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3100),
  HOST: z.string().min(1).default('127.0.0.1'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'minimal 32 karakter'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  MIDTRANS_SERVER_KEY: z.string().default(''),
  MIDTRANS_CLIENT_KEY: z.string().default(''),
  // z.coerce.boolean() menganggap string "false" sebagai true; enum ini memaksa nilai eksplisit.
  MIDTRANS_IS_PRODUCTION: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  MIDTRANS_EXPIRY_MINUTES: z.coerce.number().int().positive().default(15),
});

export function parseEnv(source = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Konfigurasi environment tidak valid — ${detail}`);
  }
  return result.data;
}

export const env = parseEnv();
```

- [ ] **Step 4: Write `validate.js`**

```js
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      // express 4 meng-cache req.query di objek yang sama; menugaskan ulang tidak berpengaruh.
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          new AppError(
            400,
            'VALIDATION',
            'Input tidak valid',
            err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
          )
        );
        return;
      }
      next(err);
    }
  };
}
```

- [ ] **Step 5: Write `backend/.env.example`**

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=3100
DATABASE_URL=postgresql://warkil:warkil@localhost:5433/warkil_kasir
JWT_SECRET=ganti-dengan-string-acak-minimal-32-karakter
FRONTEND_ORIGIN=http://localhost:5173
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_EXPIRY_MINUTES=15
```

`.env.example` is the only env file in the repo: `.gitignore` already ignores `.env` and `.env.*` but re-includes `.env.example`.

- [ ] **Step 6: Run the tests and commit**

Run: `cd backend && npx vitest run src/config src/middleware`
Expected: PASS.

```bash
git add backend/src/config backend/src/middleware backend/.env.example
git commit -m "feat(backend): validate environment and request input"
```

---

### Task 3: Prisma schema, first migration, test database harness

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/lib/prisma.js`
- Create: `backend/src/test/testEnv.js`
- Create: `backend/src/test/globalSetup.js`
- Create: `backend/src/test/db.js`
- Create: `docker-compose.yml`
- Test: `backend/src/test/db.test.js`

**Interfaces:**
- Consumes: `env` (Task 2).
- Produces: `prisma` (the shared `PrismaClient`) from `src/lib/prisma.js`; `resetDb()` and `countRows(table)` from `src/test/db.js`; `TEST_DATABASE_URL` and `testEnv` from `src/test/testEnv.js`.

- [ ] **Step 1: Write the schema**

`backend/prisma/schema.prisma` — copy the model from spec §4 **verbatim**: enums `Role`, `OrderStatus`, `OrderType`, `PaymentMethod`, `PaymentStatus`, `MarkType`; models `User`, `Shift`, `Category`, `Menu`, `MenuComponent`, `Order`, `OrderItem`, `Payment`, `CalendarMark`, `Setting`, with every `@@map`/`@map` to snake_case, the indexes and the unique constraints listed there. Header:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Exit criteria for this step: all ten models are present and so are, exactly as the spec lists them, `@@unique([businessDate, dailySeq])`, `@@unique([businessDate, queueNumber])`, `@@unique([orderId, attemptNo])` and `@@unique([date])` on `CalendarMark`.

- [ ] **Step 2: Add the compose file**

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: warkil-db
    environment:
      POSTGRES_USER: warkil
      POSTGRES_PASSWORD: warkil
      POSTGRES_DB: warkil_kasir
    ports: ['5433:5432']
    volumes: ['warkil-db:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U warkil -d warkil_kasir']
      interval: 5s
      timeout: 5s
      retries: 10

  # Database uji terpisah: tes mem-truncate tabel, jangan sampai menyentuh data dev.
  db-test:
    image: postgres:16-alpine
    container_name: warkil-db-test
    environment:
      POSTGRES_USER: warkil
      POSTGRES_PASSWORD: warkil
      POSTGRES_DB: warkil_kasir_test
    ports: ['5434:5432']
    tmpfs: ['/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U warkil -d warkil_kasir_test']
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  warkil-db:
```

Ports 5433/5434 avoid any PostgreSQL already running on the machine.

- [ ] **Step 3: Run the first migration**

```bash
docker compose up -d
cd backend && cp .env.example .env
npm run migrate -- --name init
```

Expected: `backend/prisma/migrations/<timestamp>_init/migration.sql`, and the Prisma client generated into `node_modules/.prisma`. `.env` stays untracked.

- [ ] **Step 4: Write the test harness**

`backend/src/test/testEnv.js`:

```js
export const TEST_DATABASE_URL = 'postgresql://warkil:warkil@localhost:5434/warkil_kasir_test';

// Dipakai vitest.config.js untuk mengisi process.env sebelum modul mana pun diimpor,
// karena src/config/env.js memvalidasi environment saat impor.
export const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  HOST: '127.0.0.1',
  PORT: '0',
  MIDTRANS_IS_PRODUCTION: 'false',
};
```

`backend/src/test/globalSetup.js`:

```js
import { execFileSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './testEnv.js';

export default function globalSetup() {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
    // Windows butuh shell untuk menjalankan npx.cmd.
    shell: process.platform === 'win32',
  });
}
```

`backend/src/test/db.js`:

```js
import { prisma } from '../lib/prisma.js';

export async function resetDb() {
  const rows = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"public"."${row.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

export async function countRows(table) {
  const rows = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${table}"`);
  return rows[0].count;
}
```

`backend/src/lib/prisma.js`:

```js
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 5: Write the harness test**

`backend/src/test/db.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { countRows, resetDb } from './db.js';

describe('test database', () => {
  it('menjalankan migrasi sampai tabel inti ada', async () => {
    await expect(countRows('user')).resolves.toBeGreaterThanOrEqual(0);
    await expect(countRows('order')).resolves.toBeGreaterThanOrEqual(0);
  });

  it('mengosongkan tabel dan mereset id', async () => {
    await prisma.category.create({ data: { name: 'Uji', sortOrder: 99 } });
    await resetDb();
    expect(await countRows('category')).toBe(0);
  });
});
```

`countRows` quotes the identifier, so a table mapped to a reserved SQL word (`order`) works.

- [ ] **Step 6: Run the whole suite**

Run: `cd backend && npm test`
Expected: all tests PASS, including Task 1's and Task 2's. `ECONNREFUSED` means the `db-test` container is not up yet.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml backend/prisma backend/src/lib/prisma.js backend/src/test
git commit -m "feat(backend): add prisma schema, migration and a test database"
```

---

### Task 4: Pricing service

**Files:**
- Create: `backend/src/services/pricing.js`
- Test: `backend/src/services/pricing.test.js`

**Interfaces:**
- Consumes: `badRequest` (Task 1).
- Produces:
  - `priceOf(menuId, byId)` → integer rupiah. `byId` is a `Map` of `{ id, name, price, discountPct, isBundle, components: [{ componentId, qty }] }`.
  - `grossOf(menuId, byId)` → integer rupiah before discount.
  - `priceLines(items, byId)` → `[{ productId, name, qty, unitPrice, subtotal }]` where `items` is `[{ productId, qty }]`.
  - `orderTotal(lines)` → integer rupiah.
  - `assertPricingValid(menus)` → throws on a bundle with no components, a missing component, or a bundle inside a bundle.

- [ ] **Step 1: Write the failing tests**

`backend/src/services/pricing.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { assertPricingValid, grossOf, orderTotal, priceLines, priceOf } from './pricing.js';

const plain = (id, price) => ({ id, name: id, price, discountPct: null, isBundle: false, components: [] });
const bundle = (id, discountPct, components) => ({ id, name: id, price: 0, discountPct, isBundle: true, components });
const byId = (menus) => new Map(menus.map((menu) => [menu.id, menu]));

describe('priceOf', () => {
  it('memakai harga menu biasa apa adanya', () => {
    expect(priceOf('nasi', byId([plain('nasi', 15000)]))).toBe(15000);
  });

  it('menghitung harga paket dari komponen dikali qty', () => {
    const menus = [
      plain('kikil', 20000),
      plain('kerupuk', 3000),
      bundle('paket', 0, [
        { componentId: 'kikil', qty: 1 },
        { componentId: 'kerupuk', qty: 2 },
      ]),
    ];
    expect(grossOf('paket', byId(menus))).toBe(26000);
    expect(priceOf('paket', byId(menus))).toBe(26000);
  });

  it('membulatkan diskon paket ke ratusan terdekat', () => {
    const menus = [plain('kikil', 15500), bundle('paket', 10, [{ componentId: 'kikil', qty: 1 }])];
    expect(grossOf('paket', byId(menus))).toBe(15500);
    expect(priceOf('paket', byId(menus))).toBe(14000);
  });

  it('menolak menu yang tidak ada', () => {
    expect(() => priceOf('hilang', byId([]))).toThrow(/tidak ditemukan/);
  });

  it('menolak paket berisi paket', () => {
    const menus = [
      plain('kikil', 20000),
      bundle('dalam', 0, [{ componentId: 'kikil', qty: 1 }]),
      bundle('luar', 0, [{ componentId: 'dalam', qty: 1 }]),
    ];
    expect(() => assertPricingValid(menus)).toThrow(/paket/i);
  });
});

describe('priceLines', () => {
  it('menyimpan harga satuan dari server, bukan dari klien', () => {
    const menus = [plain('kikil', 20000), bundle('paket', 10, [{ componentId: 'kikil', qty: 1 }])];
    const lines = priceLines([{ productId: 'paket', qty: 2 }, { productId: 'kikil', qty: 1 }], byId(menus));
    expect(lines).toEqual([
      { productId: 'paket', name: 'paket', qty: 2, unitPrice: 18000, subtotal: 36000 },
      { productId: 'kikil', name: 'kikil', qty: 1, unitPrice: 20000, subtotal: 20000 },
    ]);
    expect(orderTotal(lines)).toBe(56000);
  });
});
```

The 10% bundle case is the rounding pin: gross 15500 → 13950 → nearest 100 is 14000, while a truncating implementation would store 13900.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/services/pricing.test.js`
Expected: FAIL — cannot resolve `./pricing.js`.

- [ ] **Step 3: Write the service**

`backend/src/services/pricing.js`:

```js
import { badRequest } from '../lib/errors.js';

// Aturan mockup: diskon paket dibulatkan ke ratusan rupiah terdekat, dan harga
// yang tersimpan di pesanan selalu hasil ini — bukan hitungan ulang saat dibaca.
const roundTo100 = (value) => Math.round(value / 100) * 100;

export function grossOf(menuId, byId) {
  const menu = byId.get(menuId);
  if (!menu) return 0;
  return menu.components.reduce((sum, component) => {
    const child = byId.get(component.componentId);
    return sum + (child ? priceOf(child.id, byId) * component.qty : 0);
  }, 0);
}

export function priceOf(menuId, byId) {
  const menu = byId.get(menuId);
  if (!menu) throw badRequest(`Menu ${menuId} tidak ditemukan`);
  if (!menu.isBundle) return menu.price;
  return roundTo100(grossOf(menuId, byId) * (1 - (menu.discountPct ?? 0) / 100));
}

export function assertPricingValid(menus) {
  const byId = new Map(menus.map((menu) => [menu.id, menu]));
  for (const menu of menus) {
    if (!menu.isBundle) continue;
    if (menu.components.length === 0) throw badRequest(`Paket ${menu.name} belum punya komponen`);
    for (const component of menu.components) {
      const child = byId.get(component.componentId);
      if (!child) throw badRequest(`Komponen ${component.componentId} tidak ditemukan`);
      // Satu tingkat saja: harga paket bersarang tidak bisa dijelaskan ke kasir.
      if (child.isBundle) throw badRequest(`Paket ${menu.name} tidak boleh berisi paket`);
    }
  }
}

export function priceLines(items, byId) {
  return items.map((item) => {
    const menu = byId.get(item.productId);
    if (!menu) throw badRequest(`Menu ${item.productId} tidak ditemukan`);
    const unitPrice = priceOf(item.productId, byId);
    return { productId: item.productId, name: menu.name, qty: item.qty, unitPrice, subtotal: unitPrice * item.qty };
  });
}

export const orderTotal = (lines) => lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
```

- [ ] **Step 4: Run the tests and commit**

Run: `cd backend && npm test`
Expected: PASS.

```bash
git add backend/src/services/pricing.js backend/src/services/pricing.test.js
git commit -m "feat(backend): port the mockup pricing rules"
```

---

### Task 5: Business-date and shift-time helpers

**Files:**
- Create: `backend/src/lib/wib.js`
- Test: `backend/src/lib/wib.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `WIB_OFFSET_MS`; `businessDate(at?)` → `'YYYY-MM-DD'`; `businessDayStart(date)` / `businessDayEnd(date)` → `Date`; `addDays(date, days)`; `startOfWeek(date)` (Monday); `monthOf(date)` → `'YYYY-MM'`; `lastNDates(date, n)`; `wibTime(at)` → `'HH:MM'`; `shiftIndexOf(time)` → `0 | 1`.

- [ ] **Step 1: Write the failing tests**

`backend/src/lib/wib.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  addDays,
  businessDate,
  businessDayEnd,
  businessDayStart,
  lastNDates,
  monthOf,
  shiftIndexOf,
  startOfWeek,
  wibTime,
} from './wib.js';

describe('businessDate', () => {
  it('memakai tanggal Jakarta, bukan UTC', () => {
    expect(businessDate(new Date('2026-10-13T16:59:59Z'))).toBe('2026-10-13');
    expect(businessDate(new Date('2026-10-13T17:00:00Z'))).toBe('2026-10-14');
  });

  it('benar di sekitar tengah malam Jakarta', () => {
    expect(businessDate(new Date('2026-10-13T00:00:00Z'))).toBe('2026-10-13');
    expect(businessDate(new Date('2026-10-13T00:30:00Z'))).toBe('2026-10-13');
  });
});

describe('batas hari', () => {
  it('hari bisnis mulai pukul 17:00 UTC sebelumnya', () => {
    expect(businessDayStart('2026-10-14').toISOString()).toBe('2026-10-13T17:00:00.000Z');
    expect(businessDayEnd('2026-10-14').toISOString()).toBe('2026-10-14T17:00:00.000Z');
  });
});

describe('aritmetika tanggal', () => {
  it('menambah dan mengurangi hari lintas bulan', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('minggu dimulai hari Senin', () => {
    expect(startOfWeek('2026-10-13')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
  });

  it('menghasilkan n tanggal terakhir, hari ini di akhir', () => {
    expect(lastNDates('2026-10-13', 3)).toEqual(['2026-10-11', '2026-10-12', '2026-10-13']);
  });

  it('mengambil bulan', () => {
    expect(monthOf('2026-10-13')).toBe('2026-10');
  });
});

describe('waktu Jakarta', () => {
  it('mengubah instant UTC jadi jam dinding WIB', () => {
    expect(wibTime(new Date('2026-10-13T01:30:00Z'))).toBe('08:30');
    expect(wibTime(new Date('2026-10-13T16:00:00Z'))).toBe('23:00');
  });

  it('shiftIndexOf memakai batas pukul 15:00 seperti mockup', () => {
    expect(shiftIndexOf('08:00')).toBe(0);
    expect(shiftIndexOf('14:59')).toBe(0);
    expect(shiftIndexOf('15:00')).toBe(1);
    expect(shiftIndexOf('21:30')).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/lib/wib.test.js`
Expected: FAIL — cannot resolve `./wib.js`.

- [ ] **Step 3: Write the helpers**

`backend/src/lib/wib.js`:

```js
// Asia/Jakarta = UTC+7 sepanjang tahun (tanpa DST), jadi offset tetap lebih
// sederhana dan lebih cepat daripada Intl untuk perhitungan tanggal bisnis.
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (value) => String(value).padStart(2, '0');
const shifted = (at) => new Date(at.getTime() + WIB_OFFSET_MS);

export function businessDate(at = new Date()) {
  const wib = shifted(at);
  return `${wib.getUTCFullYear()}-${pad2(wib.getUTCMonth() + 1)}-${pad2(wib.getUTCDate())}`;
}

export function businessDayStart(date) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) - WIB_OFFSET_MS);
}

export function businessDayEnd(date) {
  return new Date(businessDayStart(date).getTime() + DAY_MS);
}

export function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function startOfWeek(date) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

export const monthOf = (date) => date.slice(0, 7);

export function lastNDates(date, n) {
  return Array.from({ length: n }, (_, index) => addDays(date, index - (n - 1)));
}

export function wibTime(at) {
  const wib = shifted(at);
  return `${pad2(wib.getUTCHours())}:${pad2(wib.getUTCMinutes())}`;
}

export function shiftIndexOf(time) {
  return Number.parseInt(time.slice(0, 2), 10) < 15 ? 0 : 1;
}
```

- [ ] **Step 4: Run the tests and commit**

Run: `cd backend && npm test`
Expected: PASS.

```bash
git add backend/src/lib/wib.js backend/src/lib/wib.test.js
git commit -m "feat(backend): add Asia/Jakarta business date helpers"
```

---

### Task 6: Shifts

**Files:**
- Create: `backend/src/services/shifts.js`
- Test: `backend/src/services/shifts.test.js`

**Interfaces:**
- Consumes: `prisma` (Task 3), `businessDate`, `wibTime`, `shiftIndexOf` (Task 5).
- Produces: `ensureOpenShift(cashierId, at?)` → the `Shift` row to attach orders to; `closeShift(shiftId, at?)`; `closeAllOpenShifts(cashierId, at?)` → count closed.

- [ ] **Step 1: Write the failing tests**

`backend/src/services/shifts.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { resetDb } from '../test/db.js';
import { closeAllOpenShifts, ensureOpenShift } from './shifts.js';

const at = (iso) => new Date(iso);
let cashierId = '';

beforeEach(async () => {
  await resetDb();
  const cashier = await prisma.user.create({
    data: { role: 'CASHIER', name: 'Siti Rahma', pinHash: 'x', active: true },
  });
  cashierId = cashier.id;
});

describe('ensureOpenShift', () => {
  it('membuat shift baru saat login pertama', async () => {
    const shift = await ensureOpenShift(cashierId, at('2026-10-13T01:00:00Z'));
    expect(shift.businessDate).toBe('2026-10-13');
    expect(shift.shiftIndex).toBe(0);
    expect(shift.endedAt).toBeNull();
  });

  it('memakai ulang shift yang masih terbuka pada shift yang sama', async () => {
    const first = await ensureOpenShift(cashierId, at('2026-10-13T01:00:00Z'));
    const second = await ensureOpenShift(cashierId, at('2026-10-13T04:00:00Z'));
    expect(second.id).toBe(first.id);
    expect(await prisma.shift.count()).toBe(1);
  });

  it('menutup shift lama dan membuka shift berikutnya', async () => {
    const first = await ensureOpenShift(cashierId, at('2026-10-13T01:00:00Z'));
    const second = await ensureOpenShift(cashierId, at('2026-10-13T09:00:00Z'));
    expect(second.id).not.toBe(first.id);
    expect(second.shiftIndex).toBe(1);
    const closed = await prisma.shift.findUniqueOrThrow({ where: { id: first.id } });
    expect(closed.endedAt.toISOString()).toBe('2026-10-13T09:00:00.000Z');
  });

  it('menutup shift kemarin saat kasir lupa logout', async () => {
    const yesterday = await ensureOpenShift(cashierId, at('2026-10-12T01:00:00Z'));
    const today = await ensureOpenShift(cashierId, at('2026-10-13T01:00:00Z'));
    expect(today.businessDate).toBe('2026-10-13');
    const stale = await prisma.shift.findUniqueOrThrow({ where: { id: yesterday.id } });
    expect(stale.endedAt).not.toBeNull();
    expect(await prisma.shift.count({ where: { endedAt: null } })).toBe(1);
  });
});

describe('closeAllOpenShifts', () => {
  it('menutup semua shift terbuka milik kasir saat logout', async () => {
    await ensureOpenShift(cashierId, at('2026-10-13T01:00:00Z'));
    expect(await closeAllOpenShifts(cashierId, at('2026-10-13T06:00:00Z'))).toBe(1);
    expect(await prisma.shift.count({ where: { endedAt: null } })).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/services/shifts.test.js`
Expected: FAIL — cannot resolve `./shifts.js`.

- [ ] **Step 3: Write the service**

`backend/src/services/shifts.js`:

```js
import { prisma } from '../lib/prisma.js';
import { businessDate, shiftIndexOf, wibTime } from '../lib/wib.js';

// Tanpa scheduler: shift ditutup saat login berikutnya atau saat logout. Kasir yang
// lupa logout tidak bisa menahan shift lama, dan dua perangkat pada shift yang sama
// berbagi satu baris shift. Balapan dua login serentak bisa membuat dua baris
// terbuka — masing-masing sesi memakai shiftId-nya sendiri, jadi tidak merusak data.
export async function ensureOpenShift(cashierId, at = new Date()) {
  const date = businessDate(at);
  const index = shiftIndexOf(wibTime(at));

  return prisma.$transaction(async (tx) => {
    const open = await tx.shift.findFirst({
      where: { cashierId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (open && open.businessDate === date && open.shiftIndex === index) return open;
    if (open) await tx.shift.update({ where: { id: open.id }, data: { endedAt: at } });

    return tx.shift.create({ data: { cashierId, startedAt: at, businessDate: date, shiftIndex: index } });
  });
}

export async function closeShift(shiftId, at = new Date()) {
  await prisma.shift.updateMany({ where: { id: shiftId, endedAt: null }, data: { endedAt: at } });
}

export async function closeAllOpenShifts(cashierId, at = new Date()) {
  const { count } = await prisma.shift.updateMany({ where: { cashierId, endedAt: null }, data: { endedAt: at } });
  return count;
}
```

- [ ] **Step 4: Run the tests and commit**

Run: `cd backend && npm test`
Expected: PASS.

```bash
git add backend/src/services/shifts.js backend/src/services/shifts.test.js
git commit -m "feat(backend): add shift lifecycle without a scheduler"
```

---

### Task 7: Authentication — owner password, cashier PIN, lockout, guards

**Files:**
- Create: `backend/src/services/auth.js`
- Create: `backend/src/middleware/auth.js`
- Create: `backend/src/routes/auth.js`
- Modify: `backend/src/routes/index.js`
- Test: `backend/src/routes/auth.test.js`

**Interfaces:**
- Consumes: `prisma`, `env`, `validate`, the error helpers, `ensureOpenShift`/`closeAllOpenShifts` (Task 6).
- Produces:
  - `hashSecret(value)` / `verifySecret(value, hash)` → `Promise<string>` / `Promise<boolean>`
  - `loginCashier(cashierId, pin, at?)` → `{ token, user, shiftId }`; `loginOwner(username, password, at?)` → `{ token, user }`
  - `verifySession(token)` → `{ id, role, name, shiftId? } | null`
  - `requireAuth` and `requireRole(role)` middleware; authenticated handlers read `req.auth`
  - Routes: `POST /api/auth/login`, `POST /api/auth/cashier-login`, `GET /api/auth/me`, `POST /api/auth/logout`
  - `SESSION_COOKIE = 'wk_session'` exported from `src/middleware/auth.js`

- [ ] **Step 1: Write the failing tests**

`backend/src/routes/auth.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashSecret } from '../services/auth.js';
import { resetDb } from '../test/db.js';

const app = createApp();
const PIN = '1234';
const cookieOf = (res) => res.headers['set-cookie']?.[0] ?? '';
let cashierId = '';

beforeEach(async () => {
  await resetDb();
  const cashier = await prisma.user.create({
    data: { role: 'CASHIER', name: 'Siti Rahma', pinHash: await hashSecret(PIN), active: true },
  });
  cashierId = cashier.id;
  await prisma.user.create({
    data: { role: 'OWNER', name: 'Pemilik', username: 'owner', passwordHash: await hashSecret('rahasia123'), active: true },
  });
});

describe('login kasir', () => {
  it('menerima nama dan PIN yang benar, lalu memasang cookie httpOnly', async () => {
    const res = await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: PIN });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Siti Rahma');
    expect(res.body.user).not.toHaveProperty('pinHash');
    const cookie = cookieOf(res);
    expect(cookie).toContain('wk_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('membuka shift saat login', async () => {
    await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: PIN });
    expect(await prisma.shift.count({ where: { cashierId, endedAt: null } })).toBe(1);
  });

  it('menolak PIN salah', async () => {
    const res = await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: '9999' });
    expect(res.status).toBe(401);
  });

  it('mengunci setelah 5 percobaan gagal, dan tetap menolak PIN yang benar', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: '9999' });
    }
    const correct = await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: PIN });
    expect(correct.status).toBe(423);
    expect(correct.body.error.code).toBe('LOCKED');
  });

  it('menolak kasir nonaktif', async () => {
    await prisma.user.update({ where: { id: cashierId }, data: { active: false } });
    const res = await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: PIN });
    expect(res.status).toBe(401);
  });
});

describe('login pemilik', () => {
  it('menerima username dan password yang benar', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'owner', password: 'rahasia123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('OWNER');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('menolak password salah', async () => {
    expect((await request(app).post('/api/auth/login').send({ username: 'owner', password: 'salah' })).status).toBe(401);
  });
});

describe('sesi', () => {
  it('GET /api/auth/me mengembalikan sesi dari cookie', async () => {
    const login = await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: PIN });
    const res = await request(app).get('/api/auth/me').set('Cookie', cookieOf(login));
    expect(res.body.user.name).toBe('Siti Rahma');
    expect(res.body.shiftId).toBeTruthy();
  });

  it('menolak request tanpa cookie', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('menutup shift saat logout dan menghapus cookie', async () => {
    const login = await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: PIN });
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookieOf(login));
    expect(res.status).toBe(204);
    expect(await prisma.shift.count({ where: { cashierId, endedAt: null } })).toBe(0);
    expect(cookieOf(res)).toContain('wk_session=;');
  });

  it('menolak cookie yang ditandatangani kunci lain', async () => {
    const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6Ik9XTkVSIn0.zzzz';
    const res = await request(app).get('/api/auth/me').set('Cookie', `wk_session=${forged}`);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/routes/auth.test.js`
Expected: FAIL — cannot resolve `../services/auth.js`.

- [ ] **Step 3: Write the auth service**

`backend/src/services/auth.js`:

```js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { conflict, locked, unauthorized } from '../lib/errors.js';
import { ensureOpenShift } from './shifts.js';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const SESSION_HOURS = 12;

export const hashSecret = (value) => bcrypt.hash(value, 10);
export const verifySecret = (value, hash) => bcrypt.compare(value, hash);

const sign = (payload) => jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${SESSION_HOURS}h` });

export function verifySession(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Lockout dihitung dari kolom di baris user, bukan dari memori proses: server bisa
// di-restart dan percobaan gagal tetap terhitung.
async function registerFailure(userId, at) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedAttempts: { increment: 1 } },
    select: { failedAttempts: true },
  });
  if (user.failedAttempts >= MAX_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, lockedUntil: new Date(at.getTime() + LOCK_MINUTES * 60_000) },
    });
  }
}

function assertUsable(user, at) {
  if (user.lockedUntil && user.lockedUntil > at) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - at.getTime()) / 60_000);
    throw locked(`Akun terkunci. Coba lagi dalam ${minutes} menit.`);
  }
}

export async function loginCashier(cashierId, pin, at = new Date()) {
  const cashier = await prisma.user.findFirst({ where: { id: cashierId, role: 'CASHIER' } });
  if (!cashier || !cashier.active || !cashier.pinHash) throw unauthorized('Kasir tidak ditemukan atau tidak aktif');
  assertUsable(cashier, at);

  if (!(await verifySecret(pin, cashier.pinHash))) {
    await registerFailure(cashier.id, at);
    throw unauthorized('PIN salah');
  }

  await prisma.user.update({ where: { id: cashier.id }, data: { failedAttempts: 0, lockedUntil: null } });

  const shift = await ensureOpenShift(cashier.id, at);
  const user = { id: cashier.id, role: cashier.role, name: cashier.name };
  return { token: sign({ ...user, shiftId: shift.id }), user, shiftId: shift.id };
}

export async function loginOwner(username, password, at = new Date()) {
  const owner = await prisma.user.findFirst({ where: { username, role: 'OWNER' } });
  if (!owner || !owner.active || !owner.passwordHash) throw unauthorized('Username atau password salah');
  assertUsable(owner, at);

  if (!(await verifySecret(password, owner.passwordHash))) {
    await registerFailure(owner.id, at);
    throw unauthorized('Username atau password salah');
  }

  await prisma.user.update({ where: { id: owner.id }, data: { failedAttempts: 0, lockedUntil: null } });
  const user = { id: owner.id, role: owner.role, name: owner.name };
  return { token: sign(user), user };
}

export async function createOwner({ name, username, password }) {
  if (await prisma.user.findUnique({ where: { username } })) throw conflict('Username sudah dipakai');
  const owner = await prisma.user.create({
    data: { role: 'OWNER', name, username, passwordHash: await hashSecret(password), active: true },
  });
  return { id: owner.id, role: owner.role, name: owner.name };
}
```

- [ ] **Step 4: Write the guards**

`backend/src/middleware/auth.js`:

```js
import { forbidden, unauthorized } from '../lib/errors.js';
import { verifySession } from '../services/auth.js';

export const SESSION_COOKIE = 'wk_session';

export function requireAuth(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = typeof token === 'string' ? verifySession(token) : null;
  if (!session) {
    next(unauthorized('Sesi tidak valid atau sudah berakhir'));
    return;
  }
  req.auth = session;
  next();
}

export const requireRole = (role) => (req, _res, next) => {
  if (req.auth?.role !== role) {
    next(forbidden(`Hanya untuk ${role}`));
    return;
  }
  next();
};
```

- [ ] **Step 5: Write the routes**

`backend/src/routes/auth.js`:

```js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/errors.js';
import { requireAuth, SESSION_COOKIE } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginCashier, loginOwner } from '../services/auth.js';
import { closeAllOpenShifts } from '../services/shifts.js';

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

// PIN 4 digit hanya 10.000 kombinasi: pembatasan per-IP menahan penebakan massal,
// lockout per-akun menahan penebakan terarah pada satu kasir.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Coba lagi nanti.' } },
});

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

authRouter.post(
  '/login',
  loginLimiter,
  validate({ body: z.object({ username: z.string().min(1), password: z.string().min(1) }) }),
  async (req, res, next) => {
    try {
      const { token, user } = await loginOwner(req.body.username, req.body.password);
      setSessionCookie(res, token);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/cashier-login',
  loginLimiter,
  validate({ body: z.object({ cashierId: z.string().min(1), pin: z.string().regex(/^\d{4}$/, 'PIN 4 digit') }) }),
  async (req, res, next) => {
    try {
      const { token, user, shiftId } = await loginCashier(req.body.cashierId, req.body.pin);
      setSessionCookie(res, token);
      res.json({ user, shiftId });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.id },
      select: { id: true, role: true, name: true, active: true },
    });
    if (!user || !user.active) throw unauthorized('Sesi tidak valid atau sudah berakhir');
    res.json({ user: { id: user.id, role: user.role, name: user.name }, shiftId: req.auth.shiftId ?? null });
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
```

- [ ] **Step 6: Mount the router**

`backend/src/routes/index.js`:

```js
import { Router } from 'express';
import { authRouter } from './auth.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

apiRouter.use('/auth', authRouter);
```

`src/app.js` needs no change — the router is already mounted at `/api`.

- [ ] **Step 7: Run the tests and commit**

Run: `cd backend && npm test`
Expected: PASS.

```bash
git add backend/src/services/auth.js backend/src/middleware/auth.js backend/src/routes
git commit -m "feat(backend): add owner login, cashier PIN login and session guards"
```

---

### Task 8: Cashier management and the public name picker

**Files:**
- Create: `backend/src/routes/cashiers.js`
- Modify: `backend/src/routes/index.js`
- Test: `backend/src/routes/cashiers.test.js`

**Interfaces:**
- Consumes: `prisma`, `requireAuth`, `requireRole('OWNER')`, `validate`, `hashSecret`, the error helpers.
- Produces routes: `GET /api/cashiers/public` (no auth, active cashiers only, `[{ id, name }]`), `GET /api/cashiers` (owner), `POST /api/cashiers` (owner), `PATCH /api/cashiers/:id` (owner: rename / activate / deactivate), `POST /api/cashiers/:id/pin` (owner: reset PIN).

- [ ] **Step 1: Write the failing tests**

`backend/src/routes/cashiers.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashSecret } from '../services/auth.js';
import { resetDb } from '../test/db.js';

const app = createApp();
let ownerCookie = '';
let cashierId = '';

beforeEach(async () => {
  await resetDb();
  await prisma.user.create({
    data: { role: 'OWNER', name: 'Pemilik', username: 'owner', passwordHash: await hashSecret('rahasia123'), active: true },
  });
  const cashier = await prisma.user.create({
    data: { role: 'CASHIER', name: 'Siti Rahma', pinHash: await hashSecret('1234'), active: true },
  });
  cashierId = cashier.id;
  const login = await request(app).post('/api/auth/login').send({ username: 'owner', password: 'rahasia123' });
  ownerCookie = login.headers['set-cookie'][0];
});

describe('GET /api/cashiers/public', () => {
  it('hanya membuka id dan nama kasir aktif, tanpa login', async () => {
    await prisma.user.create({ data: { role: 'CASHIER', name: 'Nonaktif', pinHash: await hashSecret('1234'), active: false } });
    const res = await request(app).get('/api/cashiers/public');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: cashierId, name: 'Siti Rahma' }]);
  });
});

describe('manajemen kasir', () => {
  it('menolak akses tanpa login', async () => {
    expect((await request(app).get('/api/cashiers')).status).toBe(401);
  });

  it('menolak kasir yang membuka daftar kasir', async () => {
    const login = await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: '1234' });
    const res = await request(app).get('/api/cashiers').set('Cookie', login.headers['set-cookie'][0]);
    expect(res.status).toBe(403);
  });

  it('membuat kasir baru dengan PIN yang di-hash', async () => {
    const res = await request(app).post('/api/cashiers').set('Cookie', ownerCookie).send({ name: 'Budi Santoso', pin: '5678' });
    expect(res.status).toBe(201);
    const created = await prisma.user.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(created.pinHash).not.toBe('5678');
    expect(res.body).not.toHaveProperty('pinHash');
  });

  it('menonaktifkan kasir tanpa menghapus riwayatnya', async () => {
    const res = await request(app).patch(`/api/cashiers/${cashierId}`).set('Cookie', ownerCookie).send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
    expect(await prisma.user.count({ where: { id: cashierId } })).toBe(1);
  });

  it('mengganti PIN kasir', async () => {
    await request(app).post(`/api/cashiers/${cashierId}/pin`).set('Cookie', ownerCookie).send({ pin: '4321' });
    expect((await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: '4321' })).status).toBe(200);
    expect((await request(app).post('/api/auth/cashier-login').send({ cashierId, pin: '1234' })).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx vitest run src/routes/cashiers.test.js`
Expected: FAIL — 404 on every route (router not mounted).

- [ ] **Step 3: Write the router**

`backend/src/routes/cashiers.js`:

```js
import { Router } from 'express';
import { z } from 'zod';
import { conflict, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { hashSecret } from '../services/auth.js';

const pinSchema = z.string().regex(/^\d{4}$/, 'PIN harus 4 digit');
const idParam = z.object({ id: z.string().min(1) });
const publicFields = { id: true, name: true, active: true, createdAt: true };

export const cashiersRouter = Router();

// Tanpa login: layar login kasir hanya perlu daftar nama untuk dipilih.
cashiersRouter.get('/public', async (_req, res, next) => {
  try {
    const cashiers = await prisma.user.findMany({
      where: { role: 'CASHIER', active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.json(cashiers);
  } catch (err) {
    next(err);
  }
});

cashiersRouter.get('/', requireAuth, requireRole('OWNER'), async (_req, res, next) => {
  try {
    res.json(await prisma.user.findMany({ where: { role: 'CASHIER' }, orderBy: { name: 'asc' }, select: publicFields }));
  } catch (err) {
    next(err);
  }
});

cashiersRouter.post(
  '/',
  requireAuth,
  requireRole('OWNER'),
  validate({ body: z.object({ name: z.string().trim().min(1).max(60), pin: pinSchema }) }),
  async (req, res, next) => {
    try {
      const existing = await prisma.user.findFirst({ where: { role: 'CASHIER', name: req.body.name } });
      if (existing) throw conflict('Nama kasir sudah dipakai');
      const cashier = await prisma.user.create({
        data: { role: 'CASHIER', name: req.body.name, pinHash: await hashSecret(req.body.pin), active: true },
        select: publicFields,
      });
      res.status(201).json(cashier);
    } catch (err) {
      next(err);
    }
  }
);

// Kasir tidak pernah dihapus: shift dan pesanan lamanya masih menunjuk ke baris ini.
cashiersRouter.patch(
  '/:id',
  requireAuth,
  requireRole('OWNER'),
  validate({
    params: idParam,
    body: z.object({ name: z.string().trim().min(1).max(60).optional(), active: z.boolean().optional() }),
  }),
  async (req, res, next) => {
    try {
      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: { name: req.body.name, active: req.body.active },
        select: publicFields,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

cashiersRouter.post(
  '/:id/pin',
  requireAuth,
  requireRole('OWNER'),
  validate({ params: idParam, body: z.object({ pin: pinSchema }) }),
  async (req, res, next) => {
    try {
      const cashier = await prisma.user.findFirst({ where: { id: req.params.id, role: 'CASHIER' } });
      if (!cashier) throw notFound('Kasir tidak ditemukan');
      await prisma.user.update({
        where: { id: cashier.id },
        data: { pinHash: await hashSecret(req.body.pin), failedAttempts: 0, lockedUntil: null },
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 4: Mount the router**

`backend/src/routes/index.js` — add:

```js
import { cashiersRouter } from './cashiers.js';
apiRouter.use('/cashiers', cashiersRouter);
```

- [ ] **Step 5: Run the tests and commit**

Run: `cd backend && npm test`
Expected: PASS.

```bash
git add backend/src/routes/cashiers.js backend/src/routes/index.js backend/src/routes/cashiers.test.js
git commit -m "feat(backend): add cashier management and the public name picker"
```

---

### Task 9: Base seed

**Files:**
- Create: `backend/prisma/seed-data.js`
- Create: `backend/prisma/seed.js`
- Test: `backend/src/seed.test.js`

**Interfaces:**
- Consumes: `prisma`, `hashSecret` (Task 7), `priceOf` (Task 4).
- Produces: `seedBase(client = prisma)` → `{ ownerId, cashierIds, categoryIds, menuIds }`, exported from `prisma/seed.js` and reused by Task 10 and by later phases' tests. Constants `SEED_PIN`, `DEMO_CASHIERS`, `CATEGORY_SEED`, `MENU_SEED`, `SETTING_SEED` in `prisma/seed-data.js`.

- [ ] **Step 1: Port the seed data**

`backend/prisma/seed-data.js` — transcribe from `frontend/src/data.js`, byte-identical in values: `SHOP`, the three names in `CASHIERS`, the four entries of `DEFAULT_CATEGORIES` in their listed order, and all 18 menus plus 3 bundles from `DEFAULT_MENUS` including `price`, `emoji`, `image`, `items` (component id + qty) and `discount`. Read the file and copy every entry — all 4 categories, all 21 menus, every component. Shape:

```js
export const SEED_PIN = '1234';
export const DEMO_CASHIERS = ['Siti Rahma', 'Budi Santoso', 'Dewi Lestari'];

export const CATEGORY_SEED = [
  // { id, name } dari DEFAULT_CATEGORIES, urutan dipertahankan
];

export const MENU_SEED = [
  // { id, name, cat, price, emoji, image, discountPct, items: [{ id, qty }] | null } dari DEFAULT_MENUS
];

export const SETTING_SEED = [{ key: 'sundayOff', value: 'true' }];
```

Every menu whose `cat` is the seed's bundle category is written with `isBundle: true` and `price: 0` — the category flag marks a bundle, never the literal category id.

An empty or partial `MENU_SEED` is not an option: the tests in Step 2 assert 4 categories, 18 plain menus, 3 bundles and the exact component count, so a short transcription fails immediately.

- [ ] **Step 2: Write the failing test**

`backend/src/seed.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from './lib/prisma.js';
import { priceOf } from './services/pricing.js';
import { seedBase } from '../prisma/seed.js';
import { MENU_SEED } from '../prisma/seed-data.js';
import { resetDb } from './test/db.js';

beforeEach(async () => {
  await resetDb();
});

describe('seedBase', () => {
  it('mengisi kategori, menu, kasir dan pemilik', async () => {
    await seedBase();
    expect(await prisma.category.count()).toBe(4);
    expect(await prisma.menu.count({ where: { isBundle: false, deletedAt: null } })).toBe(18);
    expect(await prisma.menu.count({ where: { isBundle: true } })).toBe(3);
    expect(await prisma.user.count({ where: { role: 'CASHIER', active: true } })).toBe(3);
    expect(await prisma.user.count({ where: { role: 'OWNER' } })).toBe(1);
  });

  it('menyimpan komponen paket dengan qty dari data mockup', async () => {
    await seedBase();
    const expected = MENU_SEED.filter((menu) => menu.items).reduce((sum, menu) => sum + menu.items.length, 0);
    expect(await prisma.menuComponent.count()).toBe(expected);
  });

  it('bisa dijalankan dua kali tanpa menggandakan data', async () => {
    await seedBase();
    await seedBase();
    expect(await prisma.menu.count()).toBe(21);
    expect(await prisma.user.count({ where: { role: 'CASHIER' } })).toBe(3);
  });

  it('menghitung harga tiap paket dengan aturan mockup', async () => {
    await seedBase();
    const menus = await prisma.menu.findMany({ include: { components: true } });
    const byId = new Map(
      menus.map((menu) => [
        menu.id,
        {
          id: menu.id,
          name: menu.name,
          price: menu.price,
          discountPct: menu.discountPct,
          isBundle: menu.isBundle,
          components: menu.components.map((component) => ({ componentId: component.componentId, qty: component.qty })),
        },
      ])
    );
    for (const bundle of menus.filter((menu) => menu.isBundle)) {
      expect(priceOf(bundle.id, byId)).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npx vitest run src/seed.test.js`
Expected: FAIL — cannot resolve `../prisma/seed.js`.

- [ ] **Step 4: Write the seed**

`backend/prisma/seed.js`:

```js
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { hashSecret } from '../src/services/auth.js';
import { CATEGORY_SEED, DEMO_CASHIERS, MENU_SEED, SEED_PIN, SETTING_SEED } from './seed-data.js';

const prisma = new PrismaClient();

export async function seedBase(client = prisma) {
  const ownerUsername = process.env.SEED_OWNER_USERNAME ?? 'owner';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  if (process.env.NODE_ENV === 'production' && !ownerPassword) {
    throw new Error('SEED_OWNER_PASSWORD wajib di production');
  }

  const owner = await client.user.upsert({
    where: { username: ownerUsername },
    update: {},
    create: {
      role: 'OWNER',
      name: 'Pemilik Warung',
      username: ownerUsername,
      passwordHash: await hashSecret(ownerPassword ?? 'warung123'),
    },
  });

  const categoryIds = [];
  for (const [index, category] of CATEGORY_SEED.entries()) {
    const row = await client.category.upsert({
      where: { id: category.id },
      update: { name: category.name, sortOrder: index },
      create: { id: category.id, name: category.name, sortOrder: index },
    });
    categoryIds.push(row.id);
  }

  const cashierIds = [];
  for (const name of DEMO_CASHIERS) {
    const existing = await client.user.findFirst({ where: { role: 'CASHIER', name } });
    const cashier =
      existing ??
      (await client.user.create({
        data: { role: 'CASHIER', name, pinHash: await hashSecret(process.env.SEED_PIN ?? SEED_PIN) },
      }));
    cashierIds.push(cashier.id);
  }

  // Menu biasa dulu supaya komponen paket selalu punya referensi.
  for (const menu of MENU_SEED.filter((item) => !item.items)) {
    const data = {
      id: menu.id,
      name: menu.name,
      categoryId: menu.cat,
      price: menu.price,
      emoji: menu.emoji,
      imageUrl: menu.image,
      isBundle: false,
      deletedAt: null,
    };
    await client.menu.upsert({ where: { id: menu.id }, update: data, create: data });
  }

  for (const menu of MENU_SEED.filter((item) => item.items)) {
    const data = {
      id: menu.id,
      name: menu.name,
      categoryId: menu.cat,
      price: 0,
      emoji: menu.emoji,
      imageUrl: menu.image,
      isBundle: true,
      discountPct: menu.discountPct ?? 0,
      deletedAt: null,
    };
    await client.menu.upsert({ where: { id: menu.id }, update: data, create: data });
    await client.menuComponent.deleteMany({ where: { menuId: menu.id } });
    await client.menuComponent.createMany({
      data: menu.items.map((component) => ({ menuId: menu.id, componentId: component.id, qty: component.qty })),
    });
  }

  for (const setting of SETTING_SEED) {
    await client.setting.upsert({ where: { key: setting.key }, update: { value: setting.value }, create: setting });
  }

  return { ownerId: owner.id, cashierIds, categoryIds, menuIds: MENU_SEED.map((menu) => menu.id) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await seedBase();
  await prisma.$disconnect();
  console.log('seed selesai');
}
```

Field names (`categoryId`, `imageUrl`, `discountPct`, `isBundle`, `deletedAt`) must match the schema written in Task 3 — read the schema and rename here if the spec used different field names.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npm test`
Expected: PASS.

- [ ] **Step 6: Seed the dev database by hand**

Run: `cd backend && npm run seed`
Expected: prints `seed selesai`; `npx prisma studio` shows 4 categories, 21 menus, 3 cashiers, 1 owner.

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/seed.js backend/prisma/seed-data.js backend/src/seed.test.js
git commit -m "feat(backend): seed the warung's real menu and staff"
```

---

### Task 10: Demo history generator (development only)

**Files:**
- Create: `backend/prisma/seed-demo.js`
- Test: `backend/src/seed-demo.test.js`

**Interfaces:**
- Consumes: `seedBase` (Task 9), `priceOf`/`orderTotal` (Task 4), `businessDate`/`addDays`/`lastNDates` (Task 5).
- Produces: `generateDemoHistory(days = 120, client = prisma)` → number of orders created; `mulberry32(seed)` and `hashString(text)` exported from `prisma/seed-demo.js` for the determinism test.

- [ ] **Step 1: Write the failing test**

`backend/src/seed-demo.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from './lib/prisma.js';
import { seedBase } from '../prisma/seed.js';
import { generateDemoHistory } from '../prisma/seed-demo.js';
import { resetDb } from './test/db.js';

beforeEach(async () => {
  await resetDb();
  await seedBase();
});

describe('generateDemoHistory', () => {
  it('menolak jalan di production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    await expect(generateDemoHistory(5)).rejects.toThrow(/production/i);
    process.env.NODE_ENV = previous;
  });

  it('membuat riwayat penjualan dan shift yang saling terhubung', async () => {
    const orders = await generateDemoHistory(30);
    expect(orders).toBeGreaterThan(100);
    expect(await prisma.order.count()).toBe(orders);
    expect(await prisma.payment.count({ where: { status: 'PAID' } })).toBe(orders);
    expect(await prisma.shift.count()).toBeGreaterThan(0);
    expect(await prisma.order.count({ where: { shiftId: null } })).toBe(0);
  });

  it('menghasilkan data yang sama pada dua kali jalan', async () => {
    const first = await generateDemoHistory(10);
    await resetDb();
    await seedBase();
    expect(await generateDemoHistory(10)).toBe(first);
  });

  it('tidak membuat pesanan untuk hari yang belum lewat', async () => {
    await generateDemoHistory(10);
    const today = new Date().toISOString().slice(0, 10);
    expect(await prisma.order.count({ where: { businessDate: { gt: today } } })).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx vitest run src/seed-demo.test.js`
Expected: FAIL — cannot resolve `../prisma/seed-demo.js`.

- [ ] **Step 3: Write the generator**

`backend/prisma/seed-demo.js`:

```js
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { seedBase } from './seed.js';
import { addDays, businessDate, lastNDates } from '../src/lib/wib.js';
import { orderTotal, priceOf } from '../src/services/pricing.js';

const prisma = new PrismaClient();

// RNG ber-seed: riwayat demo harus sama tiap kali dijalankan supaya angka laporan
// dan tangkapan layar bisa dibandingkan antar-jalan.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index++) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(index)) | 0;
  }
  return hash;
}

// Bobot per jam, satu baris per shift: shift pagi (08-14) ramai jam 12, shift sore
// (15-22) ramai jam 18.
const HOUR_WEIGHTS = [
  [4, 6, 5, 9, 12, 7, 3],
  [3, 7, 11, 12, 8, 4, 2],
];
const SHIFT_START_HOUR = [8, 15];

function pickHour(rng, shiftIndex) {
  const weights = HOUR_WEIGHTS[shiftIndex];
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;
  for (let offset = 0; offset < weights.length; offset++) {
    roll -= weights[offset];
    if (roll <= 0) return SHIFT_START_HOUR[shiftIndex] + offset;
  }
  return SHIFT_START_HOUR[shiftIndex];
}

// Jam WIB dikurangi 7 jam supaya instant yang disimpan jatuh pada jam Jakarta yang dituju.
const wibInstant = (date, hour, minute) =>
  new Date(`${date}T${String(hour - 7).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);

export async function generateDemoHistory(days = 120, client = prisma) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('generateDemoHistory tidak boleh dijalankan di production');
  }

  await seedBase(client);

  const menus = await client.menu.findMany({ where: { deletedAt: null }, include: { components: true } });
  const byId = new Map(
    menus.map((menu) => [
      menu.id,
      {
        id: menu.id,
        name: menu.name,
        price: menu.price,
        discountPct: menu.discountPct,
        isBundle: menu.isBundle,
        components: menu.components.map((component) => ({ componentId: component.componentId, qty: component.qty })),
      },
    ])
  );
  const weighted = menus.map((menu) => ({ id: menu.id, weight: menu.isBundle ? 1 : 4 }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);

  const cashiers = await client.user.findMany({ where: { role: 'CASHIER', active: true }, orderBy: { name: 'asc' } });
  const dates = lastNDates(addDays(businessDate(), -1), days);
  let orderCount = 0;

  for (const date of dates) {
    const rng = mulberry32(hashString(date));
    const perShift = 20 + Math.floor(rng() * 15);

    for (const shiftIndex of [0, 1]) {
      const cashier = cashiers[(hashString(date) + shiftIndex) % cashiers.length];
      const startHour = shiftIndex === 0 ? 8 : 15;
      const shift = await client.shift.create({
        data: {
          cashierId: cashier.id,
          businessDate: date,
          shiftIndex,
          startedAt: wibInstant(date, startHour, 0),
          endedAt: wibInstant(date, startHour + 7, 0),
        },
      });

      let seq = 0;
      for (let n = 0; n < perShift; n++) {
        const hour = pickHour(rng, shiftIndex);

        seq++;
        const chosen = new Map();
        const lineCount = 1 + Math.floor(rng() * 3);
        for (let line = 0; line < lineCount; line++) {
          let roll = rng() * totalWeight;
          let picked = weighted[0].id;
          for (const item of weighted) {
            roll -= item.weight;
            if (roll <= 0) {
              picked = item.id;
              break;
            }
          }
          const menu = byId.get(picked);
          chosen.set(picked, (chosen.get(picked) ?? 0) + (menu.isBundle ? 1 : rng() < 0.25 ? 2 : 1));
        }

        const items = [...chosen.entries()].map(([productId, qty]) => ({
          productId,
          name: byId.get(productId).name,
          qty,
          unitPrice: priceOf(productId, byId),
        }));
        const total = orderTotal(items);
        const method = rng() < 0.55 ? 'CASH' : 'QRIS';
        const createdAt = wibInstant(date, hour, Math.floor(rng() * 60));

        await client.order.create({
          data: {
            transactionId: `TRX-${date.replace(/-/g, '')}-${String(seq).padStart(4, '0')}`,
            businessDate: date,
            dailySeq: seq,
            queueNumber: seq,
            orderType: rng() < 0.2 ? 'TAKEAWAY' : 'DINE_IN',
            status: 'COMPLETED',
            cashierId: cashier.id,
            shiftId: shift.id,
            total,
            createdAt,
            paidAt: createdAt,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                nameSnapshot: item.name,
                qty: item.qty,
                unitPrice: item.unitPrice,
                subtotal: item.unitPrice * item.qty,
              })),
            },
            payments: {
              create: {
                method,
                status: 'PAID',
                attemptNo: 1,
                amount: total,
                paidAt: createdAt,
                providerLabel: method === 'CASH' ? 'Cash' : 'QRIS',
              },
            },
          },
        });
        orderCount++;
      }
    }
  }

  return orderCount;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const days = Number(process.env.SEED_DEMO_DAYS ?? 120);
  console.log(`riwayat demo dibuat: ${await generateDemoHistory(days)} pesanan`);
  await prisma.$disconnect();
}
```

The per-date seed, the fixed shift start hours and the hour weight table are what make two runs identical. Field names must match Task 3's schema.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npm test`
Expected: PASS. If `generateDemoHistory(30)` returns ≤ 100 orders, raise `perShift`'s base instead of loosening the assertion.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed-demo.js backend/src/seed-demo.test.js
git commit -m "feat(backend): generate 120 days of demo history in development"
```

---

### Task 11: Frontend API client, TanStack Query, auth context, route guards

**Files:**
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/api/queryClient.js`
- Create: `frontend/src/auth/AuthContext.jsx`
- Create: `frontend/src/auth/RequireRole.jsx`
- Create: `frontend/src/pages/owner/OwnerLogin.jsx`
- Test: `frontend/src/auth/AuthContext.test.jsx`
- Test: `frontend/src/auth/RequireRole.test.jsx`
- Modify: `frontend/package.json`, `frontend/vite.config.js`, `frontend/src/main.jsx`, `frontend/src/App.jsx`, `frontend/src/store.jsx`, `frontend/src/pages/cashier/CashierLogin.jsx`, `frontend/src/pages/cashier/CashierLayout.jsx`, `frontend/src/pages/cashier/CashierLayout.test.jsx`, `frontend/src/pages/cashier/PayModal.jsx`

**Interfaces:**
- Consumes: the backend routes from Tasks 7 and 8; `useCart()` from Phase 1.
- Produces: `api.get/post/patch/del(url, body)` throwing `ApiError { status, code, message, details }`; `queryClient`; `AuthProvider` + `useAuth()` → `{ user, shiftId, isLoading, loginOwner, loginCashier, logout }` (the three being TanStack mutation objects); `RequireRole({ role, loginPath, children })`.

- [ ] **Step 1: Add the dependency and the dev proxy**

Run: `cd frontend && npm install @tanstack/react-query@^5.62.0`

`frontend/vite.config.js` — extend the `server` block so `/api` reaches the backend during `npm run dev`:

```js
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: { '/api': { target: 'http://127.0.0.1:3100', changeOrigin: false } },
  },
```

- [ ] **Step 2: Write the failing tests**

`frontend/src/auth/AuthContext.test.jsx`:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { CartProvider, useCart } from '../context/CartContext.jsx';

function Probe() {
  const { user, loginCashier } = useAuth();
  const cart = useCart();
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'kosong'}</span>
      <span data-testid="lines">{cart.lines.length}</span>
      <button onClick={() => cart.dispatch({ type: 'add', menu: { id: 'm1', name: 'Sop', price: 25000 } })}>add</button>
      <button onClick={() => loginCashier.mutate({ cashierId: 'c1', pin: '1234' })}>login</button>
    </div>
  );
}

function mount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <Probe />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

test('memuat sesi yang sudah ada lewat GET /api/auth/me', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json({ user: { id: 'c1', role: 'CASHIER', name: 'Siti Rahma' }, shiftId: 's1' })));
  mount();
  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Siti Rahma'));
});

test('sesi kosong saat server membalas 401', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'UNAUTHORIZED', message: 'Belum masuk' } }, 401)));
  mount();
  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('kosong'));
});

test('login kasir mengosongkan keranjang milik kasir sebelumnya', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options) => {
      if (String(url).includes('/auth/me')) return json({ error: { code: 'UNAUTHORIZED', message: 'Belum masuk' } }, 401);
      if (String(url).includes('cashier-login') && options?.method === 'POST') {
        return json({ user: { id: 'c2', role: 'CASHIER', name: 'Budi Santoso' }, shiftId: 's2' });
      }
      return json({});
    })
  );

  mount();
  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('kosong'));
  act(() => screen.getByText('add').click());
  expect(screen.getByTestId('lines').textContent).toBe('1');

  await act(async () => {
    screen.getByText('login').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Budi Santoso'));
  expect(screen.getByTestId('lines').textContent).toBe('0');
  expect(JSON.parse(sessionStorage.getItem('kikil:cart')).lines).toEqual([]);
});
```

`frontend/src/auth/RequireRole.test.jsx`:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from './AuthContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import RequireRole from './RequireRole.jsx';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const asUser = (user) => vi.stubGlobal('fetch', vi.fn(async () => json({ user })));

function mount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/pemilik']}>
            <Routes>
              <Route path="/pemilik/login" element={<div>halaman login pemilik</div>} />
              <Route
                path="/pemilik"
                element={
                  <RequireRole role="OWNER" loginPath="/pemilik/login">
                    <div>dasbor</div>
                  </RequireRole>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

test('mengalihkan ke login saat belum masuk', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'UNAUTHORIZED', message: 'Belum masuk' } }, 401)));
  mount();
  await waitFor(() => expect(screen.getByText('halaman login pemilik')).toBeTruthy());
});

test('mengalihkan kasir yang membuka halaman pemilik', async () => {
  asUser({ id: 'c1', role: 'CASHIER', name: 'Siti Rahma' });
  mount();
  await waitFor(() => expect(screen.getByText('halaman login pemilik')).toBeTruthy());
});

test('menampilkan halaman saat perannya cocok', async () => {
  asUser({ id: 'o1', role: 'OWNER', name: 'Pemilik' });
  mount();
  await waitFor(() => expect(screen.getByText('dasbor')).toBeTruthy());
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/auth`
Expected: FAIL — cannot resolve `./AuthContext.jsx`.

- [ ] **Step 4: Write the API client**

`frontend/src/api/client.js`:

```js
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Cookie sesi httpOnly: setiap request harus menyertakan credentials.
async function request(method, url, body) {
  let res;
  try {
    res = await fetch(`/api${url}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Tidak bisa menghubungi server');
  }

  if (res.status === 204) return null;

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const error = payload?.error ?? {};
    throw new ApiError(res.status, error.code ?? 'UNKNOWN', error.message ?? 'Terjadi kesalahan', error.details);
  }
  return payload;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body ?? {}),
  patch: (url, body) => request('PATCH', url, body ?? {}),
  del: (url) => request('DELETE', url),
};
```

`frontend/src/api/queryClient.js`:

```js
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 401 bukan kegagalan sementara — jangan diulang, biar guard yang menangani.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status === 401) && failureCount < 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 5: Write the auth context**

`frontend/src/auth/AuthContext.jsx`:

```jsx
import { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const client = useQueryClient();
  const cart = useCart();

  const session = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await api.get('/auth/me');
      } catch (err) {
        if (err.status === 401) return null;
        throw err;
      }
    },
  });

  const onLoginSuccess = (data) => {
    // Keranjang kasir sebelumnya tidak boleh terbawa ke kasir berikutnya di tablet yang sama.
    cart.dispatch({ type: 'clear' });
    client.setQueryData(['session'], data);
  };

  const loginCashier = useMutation({
    mutationFn: (values) => api.post('/auth/cashier-login', values),
    onSuccess: onLoginSuccess,
  });

  const loginOwner = useMutation({
    mutationFn: (values) => api.post('/auth/login', values),
    onSuccess: onLoginSuccess,
  });

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      cart.dispatch({ type: 'clear' });
      client.setQueryData(['session'], null);
      client.clear();
    },
  });

  const value = useMemo(
    () => ({
      user: session.data?.user ?? null,
      shiftId: session.data?.shiftId ?? null,
      isLoading: session.isLoading,
      loginCashier,
      loginOwner,
      logout,
    }),
    [session.data, session.isLoading, loginCashier, loginOwner, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 6: Write the guard**

`frontend/src/auth/RequireRole.jsx`:

```jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function RequireRole({ role, loginPath, children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="wrap">
        <p className="muted">Memuat…</p>
      </div>
    );
  }

  if (!user || user.role !== role) {
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  return children;
}
```

- [ ] **Step 7: Wire the providers, the login pages and the layouts**

`frontend/src/main.jsx` — `AuthProvider` calls `useCart` and `useQueryClient`, so the nesting order is fixed:

```jsx
      <StoreProvider>
        <CartProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </QueryClientProvider>
        </CartProvider>
      </StoreProvider>
```

`frontend/src/App.jsx` — wrap the protected branches; `/kasir/login` and `/pemilik/login` stay unguarded siblings:

```jsx
        <Route
          path="/kasir/*"
          element={
            <RequireRole role="CASHIER" loginPath="/kasir/login">
              <CashierLayout />
            </RequireRole>
          }
        />
        <Route
          path="/pemilik/*"
          element={
            <RequireRole role="OWNER" loginPath="/pemilik/login">
              <OwnerLayout />
            </RequireRole>
          }
        />
```

`frontend/src/pages/cashier/CashierLogin.jsx` — the name picker comes from the API:

```jsx
export default function CashierLogin() {
  const { loginCashier } = useAuth();
  const nav = useNavigate();
  const [cashierId, setCashierId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const { data: cashiers = [], isLoading } = useQuery({
    queryKey: ['cashiers', 'public'],
    queryFn: () => api.get('/cashiers/public'),
  });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await loginCashier.mutateAsync({ cashierId, pin });
      nav('/kasir', { replace: true });
    } catch (err) {
      setError(err.message);
      setPin('');
    }
  };
```

Keep the existing markup and class names; render `cashiers` in place of the store's list, show `isLoading` in place of the list while it loads, disable submit while `loginCashier.isPending` or when no name is picked, and delete the "PIN demo: 1234" hint.

`frontend/src/pages/owner/OwnerLogin.jsx` — a username/password form with the same card markup as the cashier login, calling `loginOwner.mutateAsync({ username, password })`, showing `err.message` on failure and navigating to `/pemilik`.

`frontend/src/pages/cashier/CashierLayout.jsx` — read the session from `useAuth()` instead of `useStore()`, and pass `name={user?.name}` to the shell:

```jsx
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const items = [
    { to: '/kasir', label: 'Buat Pesanan', icon: 'cart', end: true },
    { to: '/kasir/penjualan', label: 'Penjualan', icon: 'receipt' },
    { to: '/kasir/pesanan', label: 'Pesanan Kasir', icon: 'cart' },
    {
      label: 'Log out',
      icon: 'logout',
      onClick: async () => {
        await logout.mutateAsync();
        nav('/kasir/login');
      },
    },
  ];
```

`frontend/src/store.jsx` — delete `login`, `logout` and the `session` field. `PayModal.jsx` and any other reader of `session.cashier` read `useAuth().user.name` instead. The rest of the store stays until Phase 4 replaces it.

`frontend/src/pages/cashier/CashierLayout.test.jsx` (from Phase 1) — replace the `vi.mock('../../store.jsx', …)` stub with `vi.mock('../../auth/AuthContext.jsx', () => ({ useAuth: () => ({ user: { name: 'Siti Rahma', role: 'CASHIER' }, logout: { mutateAsync: vi.fn() } }) }))`, which keeps that test free of providers.

- [ ] **Step 8: Run the frontend checks**

Run: `cd frontend && npm test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 9: Verify end to end by hand**

Terminal 1: `cd backend && npm run dev`
Terminal 2: `cd frontend && npm run dev`

- `/pemilik` while logged out lands on `/pemilik/login`.
- Owner login reaches the owner menu; a cashier session visiting `/pemilik` bounces to the same login.
- A cashier logs in by picking a name and typing `1234`, and the "PIN demo: 1234" hint is gone.
- Devtools shows `wk_session` with `HttpOnly`; `GET /api/auth/me` returns the session.
- Logging out returns to the login screen and sets `endedAt` on the open shift (`npx prisma studio`).

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src
git commit -m "feat(frontend): talk to the api with session-aware guards"
```

---

### Task 12: `CLAUDE.md`

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the project's code-style contract, read by every later phase.

- [ ] **Step 1: Write the file**

```markdown
# Warkil-Kasir

Aplikasi kasir (POS) Warung Kikil Abang. `backend/` = REST API Express + Prisma
(JavaScript ESM, dijalankan langsung dari `src/`, tanpa langkah build),
`frontend/` = aplikasi React (Vite) yang juga dilayani sebagai berkas statis
oleh backend di production.

## Perintah

```bash
docker compose up -d              # PostgreSQL dev (5433) + database uji (5434)
cd backend && npm run migrate     # prisma migrate dev
cd backend && npm run seed        # data dasar
cd backend && npm run seed:demo   # riwayat 120 hari, hanya untuk development
cd backend && npm run dev         # API di http://127.0.0.1:3100
cd frontend && npm run dev        # Vite di http://localhost:5173, proxy /api
```

Sebelum setiap commit: `npm run lint`, `npm test`, `npm run build` (frontend) di
kedua aplikasi. Di `backend/` tes memakai database uji di port 5434 dan
mem-truncate tabel — jangan mengarahkan `DATABASE_URL` ke database uji dari sesi
kerja biasa, dan jangan menjalankan `seed:demo` di production.

## Aturan kode

- Nama harus menjelaskan dirinya sendiri. Kalau sebuah nama butuh komentar
  penjelas, ganti namanya.
- Komentar hanya untuk hal yang tidak bisa dibaca dari kode: alasan verifikasi
  tanda tangan Midtrans, idempotensi webhook, kuirk pemetaan status, penanganan
  balapan (concurrency), zona waktu dan pembulatan, serta workaround. Tanpa
  komentar basa-basi, tanpa spanduk pemisah seksi, tanpa kode yang dimatikan,
  tanpa `TODO` berserakan, tanpa JSDoc.
- Satu fungsi satu tugas. Tidak ada abstraksi yang belum dipakai, tidak ada kode
  mati.
- Backend dan frontend sama-sama JavaScript ESM. Frontend memakai JSX tanpa
  TypeScript dan tanpa Tailwind; gaya visual ada di `frontend/src/index.css`.
- Handler route async selalu memakai `try { … } catch (err) { next(err) }` —
  Express 4 tidak meneruskan promise yang ditolak.
- Uang selalu bilangan bulat rupiah. Tidak ada `float`/`Decimal` untuk uang.
- Waktu disimpan UTC, tanggal bisnis dihitung lewat `backend/src/lib/wib.js`
  (Asia/Jakarta). Jangan memakai `getDate()`/`getHours()` untuk logika bisnis.
- Semua input divalidasi Zod di batas route. Server menghitung harga, status dan
  nomor antrian sendiri — nilai dari klien tidak pernah dipercaya.
- Endpoint hanya mengembalikan data yang dibutuhkan perannya. `pinHash`,
  `passwordHash` dan `failedAttempts` tidak pernah keluar dari server.
- Rahasia tidak masuk repo. `.env` ada di server, repo hanya memuat
  `.env.example`.
- Angka rupiah di UI lewat `rupiah()` di `frontend/src/utils.js`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add project conventions"
```

---

### Task 13: Phase gate

**Files:** none created; this task is verification.

- [ ] **Step 1: Run every check**

```bash
cd backend && npm run lint && npm test
cd ../frontend && npm run lint && npm test && npm run build
```

Expected: all PASS, no lint errors.

- [ ] **Step 2: Prove a fresh clone works**

```bash
docker compose down -v && docker compose up -d
cd backend && npx prisma generate && npx prisma migrate deploy && npm run seed && npm run dev
```

Expected: migrations apply to an empty database, seed completes, `GET /api/health` answers.

- [ ] **Step 3: Confirm no secret leaked into the repo**

```bash
git ls-files | grep -E "\.env$|\.env\.(local|production|test)$"
```

Expected: no output. Only `.env.example` is tracked.

- [ ] **Step 4: Commit**

Nothing to commit if the tree is clean; otherwise commit the fix the failing check revealed.

## Phase 2 exit criteria

- `backend/` runs its own JavaScript ESM source; pm2 runs `src/server.js`; the VPS path installs prod deps, generates the client and applies migrations.
- The Prisma schema from spec §4 is migrated, snake_cased and indexed.
- Owner login, cashier PIN login with lockout, session cookie, `/auth/me`, logout and role guards work and are tested.
- Shifts open on login and close on logout or on the next day's login, with no scheduler.
- Base seed and the development-only 120-day demo generator both run.
- The frontend has one API client, a session-aware auth context and role guards; the previous cashier's cart is cleared on login.
- `docker compose up -d`, generate, migrate, seed and both dev servers get a fresh clone running.
