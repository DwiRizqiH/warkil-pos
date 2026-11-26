import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp, TRUST_PROXY } from './app.js';

const app = createApp();

async function ipFor(trustProxy) {
  const probe = express();
  probe.set('trust proxy', trustProxy);
  probe.get('/ip', (req, res) => res.send(req.ip));
  const res = await request(probe).get('/ip').set('X-Forwarded-For', '1.2.3.4, 203.0.113.9');
  return res.text;
}

describe('trust proxy', () => {
  it('memakai IP klien asli di belakang nginx, bukan X-Forwarded-For palsu', async () => {
    expect(await ipFor(TRUST_PROXY)).toBe('203.0.113.9');
  });

  it('trust proxy true rentan: ini yang tidak boleh dipakai', async () => {
    expect(await ipFor(true)).toBe('1.2.3.4');
  });

  it('app sungguhan memakai setelan itu', () => {
    expect(app.get('trust proxy')).toBe(TRUST_PROXY);
  });
});

describe('csp', () => {
  // Menu photos are pasted as remote https URLs, and helmet's default img-src blanks them.
  it('mengizinkan gambar dari origin https luar', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("img-src 'self' data: https:");
  });
});

describe('cors webhook', () => {
  const dashboard = 'https://dashboard.sandbox.midtrans.com';

  it('menjawab preflight dashboard Midtrans pada endpoint notifikasi', async () => {
    const res = await request(app)
      .options('/api/payments/midtrans/notification')
      .set('Origin', dashboard)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(dashboard);
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('membalas POST dashboard dengan CORS tanpa kredensial', async () => {
    const res = await request(app).post('/api/payments/midtrans/notification').set('Origin', dashboard).send({});
    expect(res.headers['access-control-allow-origin']).toBe(dashboard);
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('tidak membuka origin dashboard untuk route API lain', async () => {
    const res = await request(app).get('/api/health').set('Origin', dashboard);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('api', () => {
  it('membalas health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('membalas 404 JSON untuk endpoint yang tidak ada, bukan HTML SPA', async () => {
    const res = await request(app).get('/api/tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
