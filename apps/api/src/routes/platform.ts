import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '../db/client.js';
import { invitations } from '../db/schema/index.js';
import { sendInviteEmail } from '../services/email.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/envelope.js';
import { UnauthorizedError } from '../utils/errors.js';

export const platformRouter = Router();

function requirePlatformKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers['x-platform-key'];
  if (!key || key !== process.env.PLATFORM_SECRET) throw new UnauthorizedError('Invalid platform key');
  next();
}

const InviteSchema = z.object({
  email: z.string().email(),
  restaurantName: z.string().min(2),
});

platformRouter.post(
  '/platform/invite',
  requirePlatformKey,
  asyncHandler(async (req, res) => {
    const { email, restaurantName } = InviteSchema.parse(req.body);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(invitations).values({ token, email, restaurantName, expiresAt });
    await sendInviteEmail(email, restaurantName, token);

    sendSuccess(res, { ok: true, message: `Invite sent to ${email}` });
  }),
);

platformRouter.get(
  '/platform/invitations',
  requirePlatformKey,
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(invitations).orderBy(invitations.createdAt);
    sendSuccess(res, rows);
  }),
);
