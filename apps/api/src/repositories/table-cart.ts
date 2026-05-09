import { eq } from 'drizzle-orm';
import { tableCarts, type CartItem } from '../db/schema/table-carts.js';
import { BaseRepository } from './base.js';

export type TableCartRow = typeof tableCarts.$inferSelect;

export class TableCartRepository extends BaseRepository {
  async findByTableId(tableId: string): Promise<TableCartRow | null> {
    const [row] = await this.db
      .select()
      .from(tableCarts)
      .where(eq(tableCarts.tableId, tableId))
      .limit(1);
    return row ?? null;
  }

  async create(input: {
    restaurantId: string;
    tableId: string;
    tableDayTokenId: string;
    ownerSessionId: string;
    items?: CartItem[];
  }): Promise<TableCartRow> {
    const [row] = await this.db
      .insert(tableCarts)
      .values({ ...input, items: input.items ?? [] })
      .returning();
    if (!row) throw new Error('Failed to create table_cart');
    return row;
  }

  async updateItems(id: string, items: CartItem[]): Promise<TableCartRow | null> {
    const [row] = await this.db
      .update(tableCarts)
      .set({ items, updatedAt: new Date() })
      .where(eq(tableCarts.id, id))
      .returning();
    return row ?? null;
  }

  async deleteByTableId(tableId: string): Promise<void> {
    await this.db.delete(tableCarts).where(eq(tableCarts.tableId, tableId));
  }
}
