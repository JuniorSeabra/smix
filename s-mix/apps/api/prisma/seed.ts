import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Artistas iniciais definidos na especificação do S-MIX.
// Rodar com: npx prisma db seed  (ou node prisma/seed.js após build)
const ARTISTS = [
  'Aline Barros',
  'Gabriela Rocha',
  'Fernandinho',
  'Isadora Pompeo',
  'Anderson Freire',
  'Bruna Karla',
  'Thalles Roberto',
  'Isaias Saad',
  'Fernanda Brum',
  'Cassiane',
  'Julliany Souza',
  'Gabriel Guedes',
];

async function main() {
  for (const name of ARTISTS) {
    const existing = await prisma.artist.findFirst({ where: { name } });
    if (!existing) {
      await prisma.artist.create({ data: { name } });
    }
  }
  console.log(`Seed concluído: ${ARTISTS.length} artistas verificados/criados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
