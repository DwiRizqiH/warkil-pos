import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { prisma } from '../src/lib/prisma.js';
import { clearOrderHistory } from './seed-demo.js';

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await clearOrderHistory();
  await prisma.$disconnect();
  console.log('pesanan dan shift dikosongkan');
}
