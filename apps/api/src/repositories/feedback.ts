import { count, desc, eq } from 'drizzle-orm';
import { feedback } from '../db/schema/feedback.js';
import { BaseRepository } from './base.js';

export type FeedbackRow = typeof feedback.$inferSelect;
export type FeedbackInsert = typeof feedback.$inferInsert;

export class FeedbackRepository extends BaseRepository {
  async findByOrderId(orderId: string): Promise<FeedbackRow | null> {
    const [row] = await this.db
      .select()
      .from(feedback)
      .where(eq(feedback.orderId, orderId))
      .limit(1);
    return row ?? null;
  }

  async create(input: FeedbackInsert): Promise<FeedbackRow> {
    const [row] = await this.db.insert(feedback).values(input).returning();
    if (!row) throw new Error('Failed to insert feedback');
    return row;
  }

  async listByRestaurant(
    restaurantId: string,
    page: number,
    pageSize: number,
  ): Promise<{ rows: FeedbackRow[]; total: number }> {
    const where = eq(feedback.restaurantId, restaurantId);
    const [{ value }] = await this.db.select({ value: count() }).from(feedback).where(where);
    const rows = await this.db
      .select()
      .from(feedback)
      .where(where)
      .orderBy(desc(feedback.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { rows, total: value };
  }

  async summary(restaurantId: string): Promise<{
    count: number;
    averageRating: number | null;
    breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  }> {
    const rows = await this.db
      .select({ rating: feedback.rating, c: count() })
      .from(feedback)
      .where(eq(feedback.restaurantId, restaurantId))
      .groupBy(feedback.rating);
    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let weighted = 0;
    for (const r of rows) {
      const k = r.rating as 1 | 2 | 3 | 4 | 5;
      const c = Number(r.c);
      breakdown[k] = c;
      total += c;
      weighted += c * k;
    }
    return {
      count: total,
      averageRating: total === 0 ? null : Math.round((weighted / total) * 10) / 10,
      breakdown,
    };
  }
}
