import { and, asc, eq, inArray } from 'drizzle-orm';
import { payments } from '../db/schema/payments.js';
import { BaseRepository } from './base.js';

export type PaymentRow = typeof payments.$inferSelect;
export type PaymentInsert = typeof payments.$inferInsert;

export class PaymentRepository extends BaseRepository {
  async create(input: PaymentInsert): Promise<PaymentRow> {
    const [row] = await this.db.insert(payments).values(input).returning();
    if (!row) throw new Error('Failed to insert payment');
    return row;
  }

  async listForOrder(orderId: string): Promise<PaymentRow[]> {
    return this.db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(asc(payments.createdAt));
  }

  async sumPaidForOrder(orderId: string): Promise<{ amount: number; tip: number }> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, orderId), inArray(payments.status, ['paid'])));
    return {
      amount: rows.reduce((s, r) => s + r.amountMillimes, 0),
      tip: rows.reduce((s, r) => s + r.tipMillimes, 0),
    };
  }

  async findById(id: string): Promise<PaymentRow | null> {
    const [row] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return row ?? null;
  }

  async update(
    id: string,
    patch: Partial<Pick<PaymentInsert, 'status' | 'paidAt' | 'providerReference'>>,
  ): Promise<PaymentRow | null> {
    const [row] = await this.db.update(payments).set(patch).where(eq(payments.id, id)).returning();
    return row ?? null;
  }
}
