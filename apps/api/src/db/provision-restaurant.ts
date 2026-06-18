/* eslint-disable no-console */
import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { db, pool } from './client.js';
import { restaurants, tables, users } from './schema/index.js';

type Args = {
  slug: string;
  name: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  tables: number;
  currency: string;
  taxPercent: number;
  servicePercent: number;
  timezone: string;
  plan: number;
  extraTables: number;
};

function parseArgs(): Args {
  const out: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]!] = m[2]!;
  }

  const slug = out.slug;
  const name = out.name;
  const adminEmail = out['admin-email'];
  const adminPassword = out['admin-password'];
  if (!slug || !name || !adminEmail || !adminPassword) {
    console.error(
      'Usage: npm run db:provision -w @orvexa/api -- --slug=<slug> --name="<name>" --admin-email=<email> --admin-password=<pw> [--admin-name="<name>"] [--tables=<n>] [--extra-tables=<n>] [--currency=TND] [--tax=19] [--service=10] [--timezone=Africa/Tunis]',
    );
    process.exit(1);
  }

  return {
    slug,
    name,
    adminEmail,
    adminPassword,
    adminName: out['admin-name'] ?? 'Owner',
    tables: out.tables ? Number(out.tables) : 0,
    currency: out.currency ?? 'TND',
    taxPercent: out.tax ? Number(out.tax) : 19,
    servicePercent: out.service ? Number(out.service) : 10,
    timezone: out.timezone ?? 'Africa/Tunis',
    plan: out.plan ? Number(out.plan) : 1,
    // Purchased table overage on top of the tier quota (PLANS.md §8). Use a large
    // value to grandfather a tenant past the soft cap.
    extraTables: out['extra-tables'] ? Number(out['extra-tables']) : 0,
  };
}

async function main() {
  const args = parseArgs();

  const existing = await db.select().from(restaurants).where(eq(restaurants.slug, args.slug));
  if (existing.length > 0) {
    console.error(
      `[provision] restaurant slug "${args.slug}" already exists (id=${existing[0]!.id})`,
    );
    process.exit(1);
  }

  const [restaurant] = await db
    .insert(restaurants)
    .values({
      slug: args.slug,
      name: args.name,
      currency: args.currency,
      taxPercent: args.taxPercent,
      servicePercent: args.servicePercent,
      timezone: args.timezone,
      plan: args.plan,
      extraTables: args.extraTables,
      // Essentiel (plan 1) defaults to a single menu QR; ordering tiers get per-table QRs.
      perTableQr: args.plan >= 2,
    })
    .returning();
  if (!restaurant) throw new Error('failed to insert restaurant');

  const passwordHash = await hash(args.adminPassword);
  const [admin] = await db
    .insert(users)
    .values({
      restaurantId: restaurant.id,
      email: args.adminEmail,
      name: args.adminName,
      role: 'admin',
      passwordHash,
    })
    .returning();
  if (!admin) throw new Error('failed to insert admin user');

  let tableCount = 0;
  if (args.tables > 0) {
    const inserted = await db
      .insert(tables)
      .values(
        Array.from({ length: args.tables }, (_, i) => ({
          restaurantId: restaurant.id,
          label: `Table ${i + 1}`,
          seats: 4,
        })),
      )
      .returning();
    tableCount = inserted.length;
  }

  console.log('[provision] done');
  console.log(`  restaurant: ${restaurant.name} (slug=${restaurant.slug}, id=${restaurant.id})`);
  console.log(`  admin: ${admin.email} (password: [set — not logged]`);
  if (tableCount > 0) console.log(`  tables: ${tableCount}`);
}

main()
  .catch((err) => {
    console.error('[provision] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
