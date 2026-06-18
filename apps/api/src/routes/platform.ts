import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { customerSessions, invitations, orders, restaurants, users } from '../db/schema/index.js';
import { AuthService } from '../services/auth.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.js';
import { sendInviteEmail } from '../services/email.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { cacheDel } from '../cache/helpers.js';
import { CacheKey } from '../cache/keys.js';

export const platformRouter = Router();

const authService = new AuthService();

function requirePlatformKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers['x-platform-key'];
  if (!key || key !== process.env.PLATFORM_SECRET) throw new UnauthorizedError('Invalid platform key');
  next();
}

const InviteSchema = z.object({
  email: z.string().email(),
  restaurantName: z.string().min(2),
  plan: z.number().int().min(1).max(4).default(1),
});

platformRouter.post(
  '/platform/invite',
  requirePlatformKey,
  asyncHandler(async (req, res) => {
    const { email, restaurantName, plan } = InviteSchema.parse(req.body);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(invitations).values({ token, email, restaurantName, plan, expiresAt });

    let emailSent = false;
    try {
      await sendInviteEmail(email, restaurantName, token);
      emailSent = true;
    } catch (err) {
      console.error('[platform] Email send failed:', err);
      const adminUrl = process.env.ADMIN_APP_URL ?? 'http://localhost:5176';
      console.log(`[platform] Manual invite link: ${adminUrl}/setup?token=${token}`);
    }

    sendSuccess(res, { ok: true, emailSent, message: emailSent ? `Invite sent to ${email}` : `Invitation created — email failed, check server logs for link` });
  }),
);

platformRouter.get(
  '/platform/invitations',
  requirePlatformKey,
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(invitations).orderBy(desc(invitations.createdAt));
    sendSuccess(res, rows);
  }),
);

platformRouter.delete(
  '/platform/invitations/:id',
  requirePlatformKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [invite] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
    if (!invite) throw new NotFoundError('Invitation not found');
    if (invite.acceptedAt) throw new ConflictError('Invitation already accepted — cancel the account instead');

    await db.delete(invitations).where(eq(invitations.id, id));
    sendSuccess(res, { ok: true });
  }),
);

platformRouter.get(
  '/platform/restaurants',
  requirePlatformKey,
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: restaurants.id,
        slug: restaurants.slug,
        name: restaurants.name,
        plan: restaurants.plan,
        isActive: restaurants.isActive,
        createdAt: restaurants.createdAt,
        ownerEmail: users.email,
      })
      .from(restaurants)
      .leftJoin(
        users,
        and(eq(users.restaurantId, restaurants.id), eq(users.role, 'admin')),
      )
      .orderBy(desc(restaurants.createdAt));

    // Usage stats per restaurant. A QR scan mints exactly one customer_sessions
    // row (same derivation as the per-restaurant view analytics in 34.7), so
    // counting sessions = counting scans. Aggregated in two grouped queries and
    // merged in JS to avoid N correlated subqueries.
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const scanRows = await db
      .select({
        restaurantId: customerSessions.restaurantId,
        scansTotal: sql<number>`count(*)::int`,
        scans30d: sql<number>`count(*) filter (where ${customerSessions.createdAt} >= ${since30d})::int`,
        lastScanAt: sql<string | null>`max(${customerSessions.createdAt})`,
      })
      .from(customerSessions)
      .groupBy(customerSessions.restaurantId);

    const orderRows = await db
      .select({
        restaurantId: orders.restaurantId,
        ordersTotal: sql<number>`count(*)::int`,
        orders30d: sql<number>`count(*) filter (where ${orders.createdAt} >= ${since30d})::int`,
      })
      .from(orders)
      .groupBy(orders.restaurantId);

    const scanByRestaurant = new Map(scanRows.map((r) => [r.restaurantId, r]));
    const orderByRestaurant = new Map(orderRows.map((r) => [r.restaurantId, r]));

    const withStats = rows.map((r) => {
      const s = scanByRestaurant.get(r.id);
      const o = orderByRestaurant.get(r.id);
      return {
        ...r,
        scansTotal: s?.scansTotal ?? 0,
        scans30d: s?.scans30d ?? 0,
        lastScanAt: s?.lastScanAt ?? null,
        ordersTotal: o?.ordersTotal ?? 0,
        orders30d: o?.orders30d ?? 0,
      };
    });

    sendSuccess(res, withStats);
  }),
);

platformRouter.post(
  '/platform/restaurants/:id/reset-password',
  requirePlatformKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [admin] = await db
      .select({ id: users.id, tokenVersion: users.tokenVersion })
      .from(users)
      .where(and(eq(users.restaurantId, id), eq(users.role, 'admin')))
      .limit(1);
    if (!admin) throw new NotFoundError('No admin account for this restaurant');

    // Generate a readable temporary password and store only its hash.
    // Bump tokenVersion so any existing sessions are invalidated.
    const newPassword = randomBytes(6).toString('base64url');
    const passwordHash = await hash(newPassword);
    await db
      .update(users)
      .set({ passwordHash, tokenVersion: admin.tokenVersion + 1, updatedAt: new Date() })
      .where(eq(users.id, admin.id));
    // Stale access tokens are rejected by the version bump, but a leaked refresh
    // token would re-mint them — drop them too.
    await new RefreshTokenRepository().deleteAllForUser(admin.id);

    sendSuccess(res, { password: newPassword });
  }),
);

// Issue a real staff-admin session for the account so the platform team can open the
// normal admin dashboard "as" the client and see everything (menu, orders, reports, …).
platformRouter.post(
  '/platform/restaurants/:id/impersonate',
  requirePlatformKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const session = await authService.impersonate(id);
    sendSuccess(res, session);
  }),
);

const PatchRestaurantPlatformSchema = z.object({
  plan: z.number().int().min(1).max(4).optional(),
  isActive: z.boolean().optional(),
});

platformRouter.patch(
  '/platform/restaurants/:id',
  requirePlatformKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const patch = PatchRestaurantPlatformSchema.parse(req.body);

    if (Object.keys(patch).length === 0) {
      const [row] = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
      if (!row) throw new NotFoundError('Restaurant not found');
      sendSuccess(res, row);
      return;
    }

    const [updated] = await db
      .update(restaurants)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning({
        id: restaurants.id,
        slug: restaurants.slug,
        name: restaurants.name,
        plan: restaurants.plan,
        isActive: restaurants.isActive,
        createdAt: restaurants.createdAt,
      });

    if (!updated) throw new NotFoundError('Restaurant not found');

    // The plan is baked into each staff access token, so a change only reaches an
    // already-signed-in user once their token is re-minted. Bump tokenVersion for the
    // restaurant's users to invalidate their current access tokens — the client then
    // refreshes and `AuthService.refresh()` re-reads the new plan from the DB.
    //
    // The customer app has no staff token — it reads the plan from the cached
    // `/restaurant` response (CacheKey.restaurant), so bust that cache too or the
    // customer keeps the old plan (e.g. stuck in menu-only mode) until the TTL lapses.
    if (patch.plan !== undefined) {
      await db
        .update(users)
        .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
        .where(eq(users.restaurantId, id));
      void cacheDel(CacheKey.restaurant(id));
    }

    sendSuccess(res, updated);
  }),
);
