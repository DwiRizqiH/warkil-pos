import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { prisma } from '../src/lib/prisma.js';
import { hashSecret } from '../src/services/auth.js';
import { CATEGORY_SEED, DEMO_CASHIERS, MENU_SEED, SEED_PIN, SETTING_SEED } from './seed-data.js';

const bundleCategoryIds = new Set(CATEGORY_SEED.filter((category) => category.isBundle).map((category) => category.id));

export async function seedBase(client = prisma) {
  const ownerUsername = process.env.SEED_OWNER_USERNAME ?? 'owner';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  if (process.env.NODE_ENV === 'production' && !ownerPassword) {
    throw new Error('SEED_OWNER_PASSWORD wajib di production');
  }

  const owner = await client.user.upsert({
    where: { username: ownerUsername },
    update: {},
    create: {
      role: 'OWNER',
      name: 'Pemilik Warung',
      username: ownerUsername,
      passwordHash: await hashSecret(ownerPassword ?? 'warung123'),
    },
  });

  const categoryIds = [];
  for (const [index, category] of CATEGORY_SEED.entries()) {
    const data = { name: category.name, sortOrder: index, isBundle: bundleCategoryIds.has(category.id) };
    const row = await client.category.upsert({
      where: { id: category.id },
      // Owner edits are now stored in the database; deploy must not reset them.
      update: {},
      create: { id: category.id, ...data },
    });
    categoryIds.push(row.id);
  }

  const cashierIds = [];
  for (const name of DEMO_CASHIERS) {
    const existing = await client.user.findFirst({ where: { role: 'CASHIER', name } });
    const cashier =
      existing ??
      (await client.user.create({
        data: { role: 'CASHIER', name, pinHash: await hashSecret(process.env.SEED_PIN ?? SEED_PIN) },
      }));
    cashierIds.push(cashier.id);
  }

  // Plain menus first so a bundle's components always resolve.
  for (const menu of MENU_SEED.filter((item) => !bundleCategoryIds.has(item.cat))) {
    const exists = await client.menu.findUnique({ where: { id: menu.id }, select: { id: true } });
    if (exists) continue;
    await client.menu.create({
      data: {
        id: menu.id,
        name: menu.name,
        categoryId: menu.cat,
        price: menu.price,
        emoji: menu.emoji,
        imageUrl: menu.image ?? null,
        discountPercent: null,
      },
    });
  }

  for (const menu of MENU_SEED.filter((item) => bundleCategoryIds.has(item.cat))) {
    const exists = await client.menu.findUnique({ where: { id: menu.id }, select: { id: true } });
    if (exists) continue;
    await client.menu.create({
      data: {
        id: menu.id,
        name: menu.name,
        categoryId: menu.cat,
        price: null,
        emoji: menu.emoji,
        imageUrl: menu.image ?? null,
        discountPercent: menu.discountPercent ?? 0,
        components: {
          create: menu.items.map((component) => ({ componentId: component.id, qty: component.qty })),
        },
      },
    });
  }

  for (const setting of SETTING_SEED) {
    await client.setting.upsert({ where: { key: setting.key }, update: { value: setting.value }, create: setting });
  }

  return { ownerId: owner.id, cashierIds, categoryIds, menuIds: MENU_SEED.map((menu) => menu.id) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await seedBase();
  await prisma.$disconnect();
  console.log('seed selesai');
}
