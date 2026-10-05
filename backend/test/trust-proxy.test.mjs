// Mengunci pilihan `trust proxy` di server.js. Kalau nilainya kembali ke `true`,
// klien bisa memalsukan X-Forwarded-For dan req.ip ikut salah — rate-limit login
// serta log audit jadi tidak bisa dipercaya.
import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';

async function reqIpFor(trustProxy) {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.get('/', (req, res) => res.send(req.ip));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address();

  // Meniru request lewat nginx: klien mengirim XFF palsu, nginx menambahkan
  // alamat asli klien di belakangnya.
  const res = await fetch(`http://127.0.0.1:${port}/`, {
    headers: { 'X-Forwarded-For': '1.2.3.4, 203.0.113.9' },
  });
  const ip = await res.text();
  server.close();
  return ip;
}

test('trust proxy "loopback" memakai IP klien asli, bukan XFF palsu', async () => {
  assert.equal(await reqIpFor('loopback'), '203.0.113.9');
});

test('trust proxy true rentan: ini yang tidak boleh dipakai', async () => {
  assert.equal(await reqIpFor(true), '1.2.3.4');
});
