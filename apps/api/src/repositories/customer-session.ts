import { and, eq } from 'drizzle-orm';
import type { LanguageCode } from '@orvexa/shared';
import { customerSessions } from '../db/schema/sessions.js';
import { tableDayTokens } from '../db/schema/tables.js';
import { BaseRepository } from './base.js';

export type CustomerSessionRow = typeof customerSessions.$inferSelect;
export type TableDayTokenRow = typeof tableDayTokens.$inferSelect;

export class CustomerSessionRepository extends BaseRepository {
  async findTokenForToday(token: string, day: string): Promise<TableDayTokenRow | null> {
    const [row] = await this.db
      .select()
      .from(tableDayTokens)
      .where(and(eq(tableDayTokens.token, token), eq(tableDayTokens.day, day)))
      .limit(1);
    return row ?? null;
  }

  async create(input: {
    restaurantId: string;
    tableId: string;
    tableDayTokenId: string;
    locale: LanguageCode;
    expiresAt: Date;
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

  async extendExpiry(id: string, expiresAt: Date): Promise<CustomerSessionRow | null> {
    const [row] = await this.db
      .update(customerSessions)
      .set({ expiresAt })
      .where(eq(customerSessions.id, id))
      .returning();
    return row ?? null;
  }
}
