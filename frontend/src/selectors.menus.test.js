import { menusForCategory } from './selectors.js';

const categories = [
  { id: 'paket', name: 'Menu Paket' },
  { id: 'minuman', name: 'Minuman' },
  { id: 'makanan', name: 'Makanan' },
];
const menus = [
  { id: 'm1', name: 'Sop Kikil', cat: 'makanan' },
  { id: 'm2', name: 'Nasi Kikil Mercon', cat: 'makanan' },
  { id: 'd1', name: 'Es Jeruk', cat: 'minuman' },
  { id: 'p1', name: 'Paket Hemat Kikil', cat: 'paket' },
];
const catOrder = new Map(categories.map((c, i) => [c.id, i]));
const rank = new Map([['d1', { id: 'd1', qty: 90, rank: 1 }]]);

test('"all" lists every menu, best sellers first then category order', () => {
  expect(menusForCategory(menus, 'all', rank, catOrder).map((m) => m.id)).toEqual(['d1', 'p1', 'm2', 'm1']);
});

test('a specific category lists only its menus, ranked first', () => {
  expect(menusForCategory(menus, 'makanan', rank, catOrder).map((m) => m.id)).toEqual(['m2', 'm1']);
});

test('menus outside the chip list still appear under "all"', () => {
  const extra = [...menus, { id: 'x1', name: 'Menu Baru', cat: 'baru' }];
  expect(menusForCategory(extra, 'all', rank, catOrder).some((m) => m.id === 'x1')).toBe(true);
});
