import { describe, expect, it } from 'vitest';
import { toCsv } from './csv.js';

describe('toCsv', () => {
  it('mengutip sel, menggandakan tanda kutip, dan menetralkan rumus Excel', () => {
    const csv = toCsv([['nama', 'total'], ['Siti "Rahma"', 3000], ['=1+1', 1000]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Siti ""Rahma"""');
    expect(csv).toContain("\"'=1+1\"");
  });
});
