import { describe, expect, it } from 'vitest';
import { DEFAULT_MENUS, generateHistory } from './data.js';
import { addDays, ymd } from './utils.js';

describe('generateHistory', () => {
  it('berhenti di kemarin karena hari ini hanya berisi pesanan dari server', () => {
    const now = new Date(2026, 10, 3, 15, 0);
    const history = generateHistory(DEFAULT_MENUS, now, 120);
    expect(history.every((tx) => tx.date < ymd(now))).toBe(true);
    expect(history.at(-1).date).toBe(ymd(addDays(now, -1)));
  });
});
