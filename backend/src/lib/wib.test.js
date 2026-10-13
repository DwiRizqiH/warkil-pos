import { describe, expect, it } from 'vitest';
import { addDays, businessDate, businessDayEnd, businessDayStart, lastNDates, shiftIndexOf } from './wib.js';

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

  it('menghasilkan n tanggal terakhir, hari ini di akhir', () => {
    expect(lastNDates('2026-10-13', 3)).toEqual(['2026-10-11', '2026-10-12', '2026-10-13']);
  });
});

describe('waktu Jakarta', () => {
  it('shiftIndexOf memakai batas pukul 15:00 seperti mockup', () => {
    expect(shiftIndexOf('08:00')).toBe(0);
    expect(shiftIndexOf('14:59')).toBe(0);
    expect(shiftIndexOf('15:00')).toBe(1);
    expect(shiftIndexOf('21:30')).toBe(1);
  });
});
