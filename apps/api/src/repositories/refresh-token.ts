import { createHash } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { refreshTokens } from '../db/schema/refresh-tokens.js';
import { BaseRepository } from './base.js';

export class RefreshTokenRepository extends BaseRepository {
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async store(token: string, userId: string, expiresAt: Date): Promise<void> {
    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash: this.hash(token),
      expiresAt,
    });
  }

  async revoke(token: string): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, this.hash(token)));
  }

  async exists(token: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, this.hash(token)),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return !!row;
  }

  async deleteExpiredForUser(userId: string): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), lt(refreshTokens.expiresAt, new Date())));
  }
}
