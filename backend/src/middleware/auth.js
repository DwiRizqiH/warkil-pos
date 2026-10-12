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
