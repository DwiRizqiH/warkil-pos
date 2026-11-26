import { Router } from 'express';
import { z } from 'zod';
import { forbidden } from '../lib/errors.js';
import { ok } from '../lib/respond.js';
import { validate } from '../middleware/validate.js';
import { verifySignature } from '../services/midtrans.js';
import { applyMidtransStatus } from '../services/payments.js';

const notificationBody = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().min(1),
  signature_key: z.string().min(1),
  transaction_id: z.string().min(1),
  transaction_status: z.string().min(1),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
  status_message: z.string().optional(),
});

export const paymentsRouter = Router();

// Midtrans calls this without a session; the SHA-512 signature is the authentication.
paymentsRouter.post(
  '/midtrans/notification',
  validate({ body: notificationBody }),
  async (req, res, next) => {
    try {
      if (!verifySignature(req.body)) throw forbidden('Signature tidak valid');
      await applyMidtransStatus(req.body);
      ok(res, { received: true });
    } catch (err) {
      next(err);
    }
  }
);
