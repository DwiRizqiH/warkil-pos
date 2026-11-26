import { badRequest, conflict, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const menuInclude = { components: true, category: { select: { isBundle: true } } };

export function toMenu(menu) {
  return {
    id: menu.id,
    name: menu.name,
    cat: menu.categoryId,
    emoji: menu.emoji ?? '🍽️',
    ...(menu.imageUrl ? { image: menu.imageUrl } : {}),
    isBundle: menu.category.isBundle,
    ...(menu.category.isBundle
      ? {
          discount: menu.discountPercent ?? 0,
          items: menu.components.map((component) => ({ id: component.componentId, qty: component.qty })),
        }
      : { price: menu.price }),
  };
}

export async function menuCatalog() {
  const [categories, menus] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, isBundle: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.menu.findMany({
      where: { deletedAt: null },
      include: menuInclude,
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
    }),
  ]);
  return { categories, menus: menus.map(toMenu) };
}

async function categoryOf(id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw badRequest('Kategori tidak ditemukan');
  return category;
}

async function assertComponents(bundleId, items) {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw badRequest('Komponen paket duplikat');
  if (bundleId && ids.includes(bundleId)) throw badRequest('Paket tidak boleh berisi dirinya sendiri');
  const components = await prisma.menu.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, category: { select: { isBundle: true } } },
  });
  if (components.length !== ids.length) throw badRequest('Ada komponen paket yang tidak ditemukan');
  if (components.some((menu) => menu.category.isBundle)) throw badRequest('Paket tidak boleh berisi paket');
}

export async function createMenu(input) {
  const category = await categoryOf(input.cat);
  if (category.isBundle) {
    if (!input.items?.length) throw badRequest('Paket harus punya isi');
    await assertComponents(null, input.items);
  } else if (!input.price) {
    throw badRequest('Harga menu wajib diisi');
  }

  const menu = await prisma.menu.create({
    data: {
      categoryId: input.cat,
      name: input.name,
      emoji: input.emoji || null,
      imageUrl: input.image ?? null,
      price: category.isBundle ? null : input.price,
      discountPercent: category.isBundle ? (input.discount ?? 0) : null,
      components: category.isBundle
        ? { create: input.items.map((item) => ({ componentId: item.id, qty: item.qty })) }
        : undefined,
    },
    include: menuInclude,
  });
  return toMenu(menu);
}

export async function updateMenu(id, input) {
  const existing = await prisma.menu.findFirst({ where: { id, deletedAt: null }, include: menuInclude });
  if (!existing) throw notFound('Menu tidak ditemukan');

  const category = await categoryOf(input.cat ?? existing.categoryId);
  const price = category.isBundle ? null : (input.price ?? existing.price);
  if (!category.isBundle && (!Number.isInteger(price) || price <= 0)) throw badRequest('Harga menu wajib diisi');

  const items = input.items ?? existing.components.map((component) => ({
    id: component.componentId,
    qty: component.qty,
  }));
  if (category.isBundle) {
    if (!items.length) throw badRequest('Paket harus punya isi');
    await assertComponents(id, items);
  }

  const menu = await prisma.$transaction(async (tx) => {
    await tx.menu.update({
      where: { id },
      data: {
        categoryId: category.id,
        name: input.name ?? existing.name,
        emoji: input.emoji === undefined ? existing.emoji : (input.emoji || null),
        imageUrl: input.image === undefined ? existing.imageUrl : (input.image || null),
        price,
        discountPercent: category.isBundle ? (input.discount ?? existing.discountPercent ?? 0) : null,
      },
    });
    if (category.isBundle) {
      await tx.menuComponent.deleteMany({ where: { bundleId: id } });
      await tx.menuComponent.createMany({
        data: items.map((item) => ({ bundleId: id, componentId: item.id, qty: item.qty })),
      });
    }
    return tx.menu.findUniqueOrThrow({ where: { id }, include: menuInclude });
  });
  return toMenu(menu);
}

export async function deleteMenu(id) {
  const menu = await prisma.menu.findFirst({ where: { id, deletedAt: null } });
  if (!menu) throw notFound('Menu tidak ditemukan');
  const used = await prisma.menuComponent.findFirst({
    where: { componentId: id, bundle: { deletedAt: null } },
  });
  if (used) throw conflict('Menu masih dipakai dalam paket');
  await prisma.menu.update({ where: { id }, data: { deletedAt: new Date() } });
}

const categorySelect = { id: true, name: true, isBundle: true };

export async function createCategory({ name }) {
  const last = await prisma.category.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  return prisma.category.create({
    data: { name, sortOrder: (last?.sortOrder ?? -1) + 1 },
    select: categorySelect,
  });
}

export async function updateCategory(id, { name }) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw notFound('Kategori tidak ditemukan');
  return prisma.category.update({ where: { id }, data: { name }, select: categorySelect });
}

export async function deleteCategory(id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw notFound('Kategori tidak ditemukan');
  const menus = await prisma.menu.count({ where: { categoryId: id } });
  if (menus > 0) throw conflict('Kategori masih berisi menu');
  await prisma.category.delete({ where: { id } });
}
