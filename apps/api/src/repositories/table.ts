import { randomBytes } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { tableDayTokens, tableZones, tables } from '../db/schema/tables.js';
import { BaseRepository } from './base.js';

function generateDayToken(): string {
  return randomBytes(16).toString('base64url');
}

export type TableRow = typeof tables.$inferSelect;
export type TableInsert = typeof tables.$inferInsert;
export type TablePatch = Partial<TableInsert>;
export type TableDayTokenRow = typeof tableDayTokens.$inferSelect;
export type TableZoneRow = typeof tableZones.$inferSelect;
export type TableZoneInsert = typeof tableZones.$inferInsert;
export type TableZonePatch = Partial<TableZoneInsert>;

export class TableRepository extends BaseRepository {
  async listForRestaurant(restaurantId: string): Promise<TableRow[]> {
    return this.db
      .select()
      .from(tables)
      .where(eq(tables.restaurantId, restaurantId))
      .orderBy(asc(tables.label));
  }

  async findById(id: string): Promise<TableRow | null> {
    const [row] = await this.db.select().from(tables).where(eq(tables.id, id)).limit(1);
    return row ?? null;
  }

  async findByPublicSlug(slug: string): Promise<TableRow | null> {
    const [row] = await this.db.select().from(tables).where(eq(tables.publicSlug, slug)).limit(1);
    return row ?? null;
  }

  /**
   * Idempotent: returns today's day-token for the table, creating one if missing.
   * Safe under concurrent scans thanks to the unique (table_id, day) index.
   */
  async findOrCreateDayToken(
    restaurantId: string,
    tableId: string,
    day: string,
  ): Promise<TableDayTokenRow> {
    const existing = await this.findDayToken(tableId, day);
    if (existing) return existing;
    const [row] = await this.db
      .insert(tableDayTokens)
      .values({ restaurantId, tableId, day, token: generateDayToken() })
      .onConflictDoUpdate({
        target: [tableDayTokens.tableId, tableDayTokens.day],
        set: { day: sql`EXCLUDED.day` },
      })
      .returning();
    if (!row) throw new Error('Failed to upsert table_day_token');
    return row;
  }

  async create(input: TableInsert): Promise<TableRow> {
    const [row] = await this.db.insert(tables).values(input).returning();
    if (!row) throw new Error('Failed to insert table');
    return row;
  }

  async update(id: string, patch: TablePatch): Promise<TableRow | null> {
    const [row] = await this.db
      .update(tables)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tables.id, id))
      .returning();
    return row ?? null;
  }

  async setOrderingCode(id: string, code: string, expiresAt: Date): Promise<TableRow | null> {
    return this.update(id, { orderingCode: code, orderingCodeExpiresAt: expiresAt });
  }

  async clearOrderingCode(id: string): Promise<void> {
    await this.db
      .update(tables)
      .set({ orderingCode: null, orderingCodeExpiresAt: null, updatedAt: new Date() })
      .where(eq(tables.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(tables).where(eq(tables.id, id)).returning({ id: tables.id });
    return rows.length > 0;
  }

  async findDayToken(tableId: string, day: string): Promise<TableDayTokenRow | null> {
    const [row] = await this.db
      .select()
      .from(tableDayTokens)
      .where(and(eq(tableDayTokens.tableId, tableId), eq(tableDayTokens.day, day)))
      .limit(1);
    return row ?? null;
  }

  async createDayToken(input: {
    restaurantId: string;
    tableId: string;
    day: string;
    token: string;
  }): Promise<TableDayTokenRow> {
    const [row] = await this.db.insert(tableDayTokens).values(input).returning();
    if (!row) throw new Error('Failed to insert table_day_token');
    return row;
  }

  async findManyByIds(ids: string[]): Promise<TableRow[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(tables).where(inArray(tables.id, ids));
  }

  async bulkUpdateLayout(
    restaurantId: string,
    entries: Array<{ id: string; zoneId: string | null; x: number | null; y: number | null }>,
  ): Promise<TableRow[]> {
    if (entries.length === 0) return [];
    return this.db.transaction(async (tx) => {
      for (const entry of entries) {
        await tx
          .update(tables)
          .set({
            zoneId: entry.zoneId,
            x: entry.x,
            y: entry.y,
            updatedAt: new Date(),
          })
          .where(and(eq(tables.id, entry.id), eq(tables.restaurantId, restaurantId)));
      }
      const ids = entries.map((e) => e.id);
      return tx
        .select()
        .from(tables)
        .where(and(eq(tables.restaurantId, restaurantId), inArray(tables.id, ids)));
    });
  }
}

export class TableZoneRepository extends BaseRepository {
  list(restaurantId: string): Promise<TableZoneRow[]> {
    return this.db
      .select()
      .from(tableZones)
      .where(eq(tableZones.restaurantId, restaurantId))
      .orderBy(asc(tableZones.sortOrder), asc(tableZones.name));
  }

  async findById(id: string): Promise<TableZoneRow | null> {
    const [row] = await this.db.select().from(tableZones).where(eq(tableZones.id, id)).limit(1);
    return row ?? null;
  }

  async create(input: TableZoneInsert): Promise<TableZoneRow> {
    const [row] = await this.db.insert(tableZones).values(input).returning();
    if (!row) throw new Error('Failed to insert table_zone');
    return row;
  }

  async update(id: string, patch: TableZonePatch): Promise<TableZoneRow | null> {
    const [row] = await this.db
      .update(tableZones)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tableZones.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(tableZones)
      .where(eq(tableZones.id, id))
      .returning({ id: tableZones.id });
    return rows.length > 0;
  }

  async reorder(restaurantId: string, ids: string[]): Promise<TableZoneRow[]> {
    return this.db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i += 1) {
        await tx
          .update(tableZones)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(tableZones.id, ids[i]!), eq(tableZones.restaurantId, restaurantId)));
      }
      return tx
        .select()
        .from(tableZones)
        .where(eq(tableZones.restaurantId, restaurantId))
        .orderBy(asc(tableZones.sortOrder), asc(tableZones.name));
    });
  }

  async maxSortOrder(restaurantId: string): Promise<number> {
    const rows = await this.db
      .select({ sortOrder: tableZones.sortOrder })
      .from(tableZones)
      .where(eq(tableZones.restaurantId, restaurantId))
      .orderBy(asc(tableZones.sortOrder));
    if (rows.length === 0) return -1;
    return rows[rows.length - 1]!.sortOrder;
  }
}
