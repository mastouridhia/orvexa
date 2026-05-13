import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { and, eq } from 'drizzle-orm';
import { db, pool } from './client.js';
import { restaurants, users } from './schema/index.js';

type Args = {
  slug: string;
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'manager' | 'kitchen' | 'waiter';
};

function parseArgs(): Args {
  const out: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]!] = m[2]!;
  }

  const slug = out.slug;
  const email = out.email;
  const name = out.name;
  const password = out.password;
  if (!slug || !email || !name || !password) {
    console.error(
      'Usage: npm run db:add-admin -w @orvexa/api -- --slug=<slug> --email=<email> --name="<name>" --password=<pw> [--role=admin]',
    );
    process.exit(1);
  }

  const role = (out.role ?? 'admin') as Args['role'];
  if (!['admin', 'manager', 'kitchen', 'waiter'].includes(role)) {
    console.error(`[add-admin] invalid role "${role}"`);
    process.exit(1);
  }

  return { slug, email, name, password, role };
}

async function main() {
  const args = parseArgs();

  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.slug, args.slug));
  if (!restaurant) {
    console.error(`[add-admin] no restaurant with slug "${args.slug}"`);
    process.exit(1);
  }

  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.restaurantId, restaurant.id), eq(users.email, args.email)));
  if (existing.length > 0) {
    console.error(`[add-admin] user ${args.email} already exists for ${args.slug}`);
    process.exit(1);
  }

  const passwordHash = await hash(args.password);
  const [user] = await db
    .insert(users)
    .values({
      restaurantId: restaurant.id,
      email: args.email,
      name: args.name,
      role: args.role,
      passwordHash,
    })
    .returning();
  if (!user) throw new Error('failed to insert user');

  console.log('[add-admin] done');
  console.log(`  restaurant: ${restaurant.name} (slug=${restaurant.slug})`);
  console.log(`  user: ${user.email} role=${user.role}`);
  console.log(`  password: ${args.password}`);
}

main()
  .catch((err) => {
    console.error('[add-admin] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
