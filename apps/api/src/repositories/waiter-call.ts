import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { waiterCalls } from '../db/schema/waiter-calls.js';
import { BaseRepository } from './base.js';

export type WaiterCallRow = typeof waiterCalls.$inferSelect;
export type WaiterCallKind = WaiterCallRow['kind'];

export class WaiterCallRepository extends BaseRepository {
  async create(input: {
    restaurantId: string;
    tableId: string;
    kind: WaiterCallKind;
    note?: string | null;
  }): Promise<WaiterCallRow> {
    const [row] = await this.db.insert(waiterCalls).values(input).returning();
    if (!row) throw new Error('Failed to insert waiter_call');
    return row;
  }

  async findById(id: string): Promise<WaiterCallRow | null> {
    const [row] = await this.db.select().from(waiterCalls).where(eq(waiterCalls.id, id)).limit(1);
    return row ?? null;
  }

  async listOpenForRestaurant(restaurantId: string): Promise<WaiterCallRow[]> {
    return this.db
      .select()
      .from(waiterCalls)
      .where(and(eq(waiterCalls.restaurantId, restaurantId), isNull(waiterCalls.clearedAt)))
      .orderBy(asc(waiterCalls.createdAt));
  }

  async listAllForRestaurant(restaurantId: string, limit = 100): Promise<WaiterCallRow[]> {
    return this.db
      .select()
      .from(waiterCalls)
      .where(eq(waiterCalls.restaurantId, restaurantId))
      .orderBy(desc(waiterCalls.createdAt))
      .limit(limit);
  }

  async listOpenForTables(tableIds: string[]): Promise<WaiterCallRow[]> {
    if (tableIds.length === 0) return [];
    return this.db
      .select()
      .from(waiterCalls)
      .where(and(inArray(waiterCalls.tableId, tableIds), isNull(waiterCalls.clearedAt)));
  }

  async clear(id: string, clearedByUserId: string | null): Promise<WaiterCallRow | null> {
    const [row] = await this.db
      .update(waiterCalls)
      .set({ clearedAt: new Date(), clearedByUserId })
      .where(and(eq(waiterCalls.id, id), isNull(waiterCalls.clearedAt)))
      .returning();
    return row ?? null;
  }
}
