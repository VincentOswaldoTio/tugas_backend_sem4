import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

let bannerBuffer = null;
try {
  bannerBuffer = fs.readFileSync(path.resolve('public/asset/gambar_promo/promo_gacor.jpg'));
} catch (err) {
  console.error('Peringatan: Gagal membaca file banner default. Menggunakan null.', err.message);
}

const defaultCategories = [
  { name: 'Mobile', slug: 'mobile' },
  { name: 'PC', slug: 'pc' },
  { name: 'RPG', slug: 'rpg' },
  { name: 'FPS', slug: 'fps' },
  { name: 'MOBA', slug: 'moba' },
  { name: 'Battle Royale', slug: 'battle-royale' },
  { name: 'Sandbox', slug: 'sandbox' },
  { name: 'Strategy', slug: 'strategy' },
  { name: 'Sports', slug: 'sports' },
];

const defaultPromoBanners = [
  {
    title: 'Promo Games: Cashback hingga 90% Buat Top Up Game di RAST',
    periodText: 'Periode Promo 1-30 Okt 2025',
    regionText: 'Seluruh Indonesia',
    categoryText: 'Games',
    subheading: 'Promo Mobile Legends di RAST Games GRATIS* Weekly Diamond Pass, Weekly Diamond Pass 2x (100% uang kembali), 59 Diamonds (100% uang kembali) S&K Berlaku',
    image: bannerBuffer,
    isActive: true,
  }
];

const defaultPromos = [
  {
    category: 'Weekly Diamond Pass',
    gameName: 'Mobile Legends',
    periodText: '1 Oktober–31 Desember 2025',
    timeText: '(15.00-18.00)',
    cashbackText: 'Cashback 100% (maks. Rp27.195)',
    notes: '-',
    isActive: true,
  },
  {
    category: '59 Diamonds',
    gameName: 'Mobile Legends',
    periodText: '1 Oktober–31 Desember 2025',
    timeText: '(00.00-23.59)',
    cashbackText: 'Cashback 100% (maks. Rp15.246)',
    notes: 'Promo hanya berlaku untuk pengguna RAST Plus',
    isActive: true,
  },
  {
    category: 'Weekly Diamond Pass',
    gameName: 'Mobile Legends',
    periodText: '1 Oktober–31 Desember 2025',
    timeText: '(15.00-18.00)',
    cashbackText: 'Cashback 100% (maks. Rp27.195)',
    notes: '-',
    isActive: true,
  }
];

async function main() {
  for (const cat of defaultCategories) {
    await prisma.categories.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('Categories seeded successfully');

  // Seed promo banners
  await prisma.promo_banners.deleteMany({});
  for (const banner of defaultPromoBanners) {
    await prisma.promo_banners.create({
      data: banner,
    });
  }
  console.log('Promo banners seeded successfully');

  // Seed promos (schedule rows)
  await prisma.promos.deleteMany({});
  for (const promo of defaultPromos) {
    await prisma.promos.create({
      data: promo,
    });
  }
  console.log('Promos seeded successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
