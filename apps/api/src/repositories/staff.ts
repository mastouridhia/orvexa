import { and, asc, between, eq, isNull, sql } from 'drizzle-orm';
import { staffShifts, users } from '../db/schema/staff.js';
import { BaseRepository } from './base.js';

export type StaffRow = typeof users.$inferSelect;
export type StaffInsert = typeof users.$inferInsert;
export type StaffPatch = Partial<StaffInsert>;
export type StaffShiftRow = typeof staffShifts.$inferSelect;
export type StaffShiftInsert = typeof staffShifts.$inferInsert;

export class StaffRepository extends BaseRepository {
  async findActiveById(id: string): Promise<StaffRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.disabledAt)))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<StaffRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async findAdminByRestaurant(restaurantId: string): Promise<StaffRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(
        and(eq(users.restaurantId, restaurantId), eq(users.role, 'admin'), isNull(users.disabledAt)),
      )
      .limit(1);
    return row ?? null;
  }

  async findActiveByEmail(email: string, restaurantId?: string): Promise<StaffRow | null> {
    const condition = restaurantId
      ? and(eq(users.email, email), eq(users.restaurantId, restaurantId), isNull(users.disabledAt))
      : and(eq(users.email, email), isNull(users.disabledAt));
    const [row] = await this.db.select().from(users).where(condition).limit(1);
    return row ?? null;
  }

  async recordFailedLogin(id: string): Promise<void> {
    const LOCK_THRESHOLD = 5;
    await this.db
      .update(users)
      .set({
        failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
        lockedUntil: sql`CASE WHEN ${users.failedLoginAttempts} + 1 >= ${LOCK_THRESHOLD} THEN NOW() + INTERVAL '15 minutes' ELSE ${users.lockedUntil} END`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async clearLoginAttempts(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async findByEmail(email: string, restaurantId: string): Promise<StaffRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.restaurantId, restaurantId)))
      .limit(1);
    return row ?? null;
  }

  async listForRestaurant(restaurantId: string): Promise<StaffRow[]> {
    return this.db
      .select()
      .from(users)
      .where(eq(users.restaurantId, restaurantId))
      .orderBy(asc(users.name));
  }

  async create(input: StaffInsert): Promise<StaffRow> {
    const [row] = await this.db.insert(users).values(input).returning();
    if (!row) throw new Error('Failed to insert staff user');
    return row;
  }

  async update(id: string, patch: StaffPatch): Promise<StaffRow | null> {
    const [row] = await this.db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  async bumpTokenVersion(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, id));
  }
}

export class StaffShiftRepository extends BaseRepository {
  async findForUserDate(userId: string, shiftDate: string): Promise<StaffShiftRow | null> {
    const [row] = await this.db
      .select()
      .from(staffShifts)
      .where(and(eq(staffShifts.userId, userId), eq(staffShifts.shiftDate, shiftDate)))
      .limit(1);
    return row ?? null;
  }

  async listForRestaurantDate(restaurantId: string, shiftDate: string): Promise<StaffShiftRow[]> {
    return this.db
      .select()
      .from(staffShifts)
      .where(and(eq(staffShifts.restaurantId, restaurantId), eq(staffShifts.shiftDate, shiftDate)));
  }

  async listForRestaurantRange(
    restaurantId: string,
    from: string,
    to: string,
  ): Promise<StaffShiftRow[]> {
    return this.db
      .select()
      .from(staffShifts)
      .where(
        and(eq(staffShifts.restaurantId, restaurantId), between(staffShifts.shiftDate, from, to)),
      );
  }

  async upsertPresence(input: {
    restaurantId: string;
    userId: string;
    shiftDate: string;
    present: boolean;
  }): Promise<StaffShiftRow> {
    const existing = await this.findForUserDate(input.userId, input.shiftDate);
    const now = new Date();
    if (existing) {
      const [row] = await this.db
        .update(staffShifts)
        .set({
          present: input.present,
          checkedInAt: input.present && !existing.checkedInAt ? now : existing.checkedInAt,
          checkedOutAt: !input.present ? now : existing.checkedOutAt,
          updatedAt: now,
        })
        .where(eq(staffShifts.id, existing.id))
        .returning();
      if (!row) throw new Error('Failed to update staff shift');
      return row;
    }
    const [row] = await this.db
      .insert(staffShifts)
      .values({
        restaurantId: input.restaurantId,
        userId: input.userId,
        shiftDate: input.shiftDate,
        present: input.present,
        checkedInAt: input.present ? now : null,
      })
      .returning();
    if (!row) throw new Error('Failed to insert staff shift');
    return row;
  }
}
