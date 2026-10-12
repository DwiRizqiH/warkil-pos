import { describe, expect, it } from 'vitest';
import { assertPricingValid, grossOf, orderTotal, priceLines, priceOf } from './pricing.js';

const plain = (id, price) => ({ id, name: id, price, discountPct: null, isBundle: false, components: [] });
const bundle = (id, discountPct, components) => ({ id, name: id, price: 0, discountPct, isBundle: true, components });
const byId = (menus) => new Map(menus.map((menu) => [menu.id, menu]));

describe('priceOf', () => {
  it('memakai harga menu biasa apa adanya', () => {
    expect(priceOf('nasi', byId([plain('nasi', 15000)]))).toBe(15000);
  });

  it('menghitung harga paket dari komponen dikali qty', () => {
    const menus = [
      plain('kikil', 20000),
      plain('kerupuk', 3000),
      bundle('paket', 0, [
        { componentId: 'kikil', qty: 1 },
        { componentId: 'kerupuk', qty: 2 },
      ]),
    ];
    expect(grossOf('paket', byId(menus))).toBe(26000);
    expect(priceOf('paket', byId(menus))).toBe(26000);
  });

  it('membulatkan diskon paket ke ratusan terdekat', () => {
    const menus = [plain('kikil', 15500), bundle('paket', 10, [{ componentId: 'kikil', qty: 1 }])];
    expect(grossOf('paket', byId(menus))).toBe(15500);
    expect(priceOf('paket', byId(menus))).toBe(14000);
  });

  it('menolak menu yang tidak ada', () => {
    expect(() => priceOf('hilang', byId([]))).toThrow(/tidak ditemukan/);
  });

  it('menolak paket berisi paket', () => {
    const menus = [
      plain('kikil', 20000),
      bundle('dalam', 0, [{ componentId: 'kikil', qty: 1 }]),
      bundle('luar', 0, [{ componentId: 'dalam', qty: 1 }]),
    ];
    expect(() => assertPricingValid(menus)).toThrow(/paket/i);
  });
});

describe('priceLines', () => {
  it('menyimpan harga satuan dari server, bukan dari klien', () => {
    const menus = [plain('kikil', 20000), bundle('paket', 10, [{ componentId: 'kikil', qty: 1 }])];
    const lines = priceLines([{ productId: 'paket', qty: 2 }, { productId: 'kikil', qty: 1 }], byId(menus));
    expect(lines).toEqual([
      { productId: 'paket', name: 'paket', qty: 2, unitPrice: 18000, subtotal: 36000 },
      { productId: 'kikil', name: 'kikil', qty: 1, unitPrice: 20000, subtotal: 20000 },
    ]);
    expect(orderTotal(lines)).toBe(56000);
  });

  it.each([[0], [-1], [1.5], ['2']])('menolak qty %s dari klien', (qty) => {
    const menus = [plain('kikil', 20000)];
    expect(() => priceLines([{ productId: 'kikil', qty }], byId(menus))).toThrow(/jumlah/i);
  });

  it('menolak menu biasa yang harganya kosong', () => {
    const menus = [{ ...plain('kikil', null) }];
    expect(() => priceOf('kikil', byId(menus))).toThrow(/harga/i);
  });
});
