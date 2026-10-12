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
