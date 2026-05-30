import { and, eq, gt, sql } from 'drizzle-orm';
import type { LanguageCode } from '@orvexa/shared';
import { customerSessions } from '../db/schema/sessions.js';
import { BaseRepository } from './base.js';

export type CustomerSessionRow = typeof customerSessions.$inferSelect;

export class CustomerSessionRepository extends BaseRepository {
  /**
   * Force-expire every still-active customer session for a table. Used when
   * the table is marked clean / free so the previous occupant's cached JWT
   * stops working before the next customer scans in.
   */
  async expireActiveForTable(tableId: string): Promise<number> {
    const rows = await this.db
      .update(customerSessions)
      .set({ expiresAt: sql`NOW()` })
      .where(and(eq(customerSessions.tableId, tableId), gt(customerSessions.expiresAt, sql`NOW()`)))
      .returning({ id: customerSessions.id });
    return rows.length;
  }

  async create(input: {
    restaurantId: string;
    tableId: string;
    tableDayTokenId: string;
    locale: LanguageCode;
    expiresAt: Date;
    absoluteExpiresAt: Date;
    presenceVerifiedAt?: Date;
  }): Promise<CustomerSessionRow> {
    const [row] = await this.db.insert(customerSessions).values(input).returning();
    if (!row) throw new Error('Failed to create customer session');
    return row;
  }

  async findById(id: string): Promise<CustomerSessionRow | null> {
    const [row] = await this.db
      .select()
      .from(customerSessions)
      .where(eq(customerSessions.id, id))
      .limit(1);
    return row ?? null;
  }

  async markPresenceVerified(id: string): Promise<CustomerSessionRow | null> {
    const [row] = await this.db
      .update(customerSessions)
      .set({ presenceVerifiedAt: sql`NOW()` })
      .where(eq(customerSessions.id, id))
      .returning();
    return row ?? null;
  }

  async extendExpiry(id: string, expiresAt: Date): Promise<CustomerSessionRow | null> {
    // Clamp to absolute_expires_at so renewals cannot extend past the lifetime cap
    const [row] = await this.db
      .update(customerSessions)
      .set({ expiresAt: sql`LEAST(${expiresAt.toISOString()}::timestamptz, absolute_expires_at)` })
      .where(eq(customerSessions.id, id))
      .returning();
    return row ?? null;
  }
}
