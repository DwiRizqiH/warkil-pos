import { badRequest } from '../lib/errors.js';

// Bundle discounts follow the mockup: rounded to the nearest 100 rupiah.
const roundTo100 = (value) => Math.round(value / 100) * 100;

export function grossOf(menuId, byId) {
  const menu = byId.get(menuId);
  if (!menu) return 0;
  return menu.components.reduce((sum, component) => {
    const child = byId.get(component.componentId);
    return sum + (child ? priceOf(child.id, byId) * component.qty : 0);
  }, 0);
}

export function priceOf(menuId, byId) {
  const menu = byId.get(menuId);
  if (!menu) throw badRequest(`Menu ${menuId} tidak ditemukan`);
  if (!menu.isBundle) {
    if (!Number.isInteger(menu.price)) throw badRequest(`Harga menu ${menu.name} belum diisi`);
    return menu.price;
  }
  return roundTo100(grossOf(menuId, byId) * (1 - (menu.discountPct ?? 0) / 100));
}

export function assertPricingValid(menus) {
  const byId = new Map(menus.map((menu) => [menu.id, menu]));
  for (const menu of menus) {
    if (!menu.isBundle) continue;
    if (menu.components.length === 0) throw badRequest(`Paket ${menu.name} belum punya komponen`);
    for (const component of menu.components) {
      const child = byId.get(component.componentId);
      if (!child) throw badRequest(`Komponen ${component.componentId} tidak ditemukan`);
      if (child.isBundle) throw badRequest(`Paket ${menu.name} tidak boleh berisi paket`);
    }
  }
}

export function priceLines(items, byId) {
  return items.map((item) => {
    const menu = byId.get(item.productId);
    if (!menu) throw badRequest(`Menu ${item.productId} tidak ditemukan`);
    if (!Number.isInteger(item.qty) || item.qty < 1) throw badRequest(`Jumlah menu ${menu.name} tidak valid`);
    const unitPrice = priceOf(item.productId, byId);
    return { productId: item.productId, name: menu.name, qty: item.qty, unitPrice, subtotal: unitPrice * item.qty };
  });
}

export const orderTotal = (lines) => lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
