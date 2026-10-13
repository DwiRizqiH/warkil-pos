import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { locked, unauthorized } from '../lib/errors.js';
import { ensureOpenShift } from './shifts.js';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// One lifetime for the token and the cookie, so the two cannot drift apart.
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
// The owner username is public and there is only one owner row, so a hard lock hands anyone on the
// network a free way to keep the owner out of his own reports. Slow the guesses down instead.
const OWNER_SLOWDOWN_MS = 300;
const OWNER_MAX_SLOWDOWN_STEPS = 5;

export const hashSecret = (value) => bcrypt.hash(value, 10);
export const verifySecret = (value, hash) => bcrypt.compare(value, hash);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sign = (payload) => jwt.sign(payload, env.JWT_SECRET, { expiresIn: SESSION_MAX_AGE_MS / 1000 });

export function verifySession(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

// The lockout counter lives on the user row, not in process memory, so a restart does not clear it.
async function registerFailure(userId, at, { lock }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedPinCount: { increment: 1 } },
    select: { failedPinCount: true },
  });
  if (lock && user.failedPinCount >= MAX_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedPinCount: 0, pinLockedUntil: new Date(at.getTime() + LOCK_MINUTES * 60_000) },
    });
  }
  return user.failedPinCount;
}

function assertUsable(user, at) {
  if (user.pinLockedUntil && user.pinLockedUntil > at) {
    const minutes = Math.ceil((user.pinLockedUntil.getTime() - at.getTime()) / 60_000);
    throw locked(`Akun terkunci. Coba lagi dalam ${minutes} menit.`);
  }
}

const publicUser = (user) => ({ id: user.id, role: user.role, name: user.name });

export async function loginCashier(cashierId, pin, at = new Date()) {
  const cashier = await prisma.user.findFirst({ where: { id: cashierId, role: 'CASHIER' } });
  if (!cashier || !cashier.isActive || !cashier.pinHash) throw unauthorized('Kasir tidak ditemukan atau tidak aktif');
  assertUsable(cashier, at);

  if (!(await verifySecret(pin, cashier.pinHash))) {
    await registerFailure(cashier.id, at, { lock: true });
    throw unauthorized('PIN salah');
  }

  await prisma.user.update({ where: { id: cashier.id }, data: { failedPinCount: 0, pinLockedUntil: null } });

  const shift = await ensureOpenShift(cashier.id, at);
  const user = publicUser(cashier);
  return { token: sign({ ...user, shiftId: shift.id }), user, shiftId: shift.id };
}

export async function loginOwner(username, password, at = new Date()) {
  const owner = await prisma.user.findFirst({ where: { username, role: 'OWNER' } });
  if (!owner || !owner.isActive || !owner.passwordHash) throw unauthorized('Username atau password salah');
  assertUsable(owner, at);

  if (!(await verifySecret(password, owner.passwordHash))) {
    const failures = await registerFailure(owner.id, at, { lock: false });
    await delay(Math.min(failures, OWNER_MAX_SLOWDOWN_STEPS) * OWNER_SLOWDOWN_MS);
    throw unauthorized('Username atau password salah');
  }

  await prisma.user.update({ where: { id: owner.id }, data: { failedPinCount: 0, pinLockedUntil: null } });
  return { token: sign(publicUser(owner)), user: publicUser(owner) };
}
