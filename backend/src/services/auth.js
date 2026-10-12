import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { locked, unauthorized } from '../lib/errors.js';
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

// The lockout counter lives on the user row, not in process memory, so a restart does not clear it.
async function registerFailure(userId, at) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedPinCount: { increment: 1 } },
    select: { failedPinCount: true },
  });
  if (user.failedPinCount >= MAX_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedPinCount: 0, pinLockedUntil: new Date(at.getTime() + LOCK_MINUTES * 60_000) },
    });
  }
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
    await registerFailure(cashier.id, at);
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
    await registerFailure(owner.id, at);
    throw unauthorized('Username atau password salah');
  }

  await prisma.user.update({ where: { id: owner.id }, data: { failedPinCount: 0, pinLockedUntil: null } });
  return { token: sign(publicUser(owner)), user: publicUser(owner) };
}
