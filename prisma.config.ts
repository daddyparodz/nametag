// Load .env file in development (optional in production where env vars come from Docker)
await (async () => {
  try {
    await import('dotenv/config');
  } catch {
    // dotenv not available or not needed (production)
  }
})();

import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL
  ?? (process.env.DB_HOST && process.env.DB_PORT && process.env.DB_NAME && process.env.DB_USER
    ? `postgresql://${process.env.DB_USER}${process.env.DB_PASSWORD ? `:${process.env.DB_PASSWORD}` : ''}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    : undefined);

if (!databaseUrl) {
  throw new Error('DATABASE_URL (or DB_HOST/DB_PORT/DB_NAME/DB_USER) is required for Prisma.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
