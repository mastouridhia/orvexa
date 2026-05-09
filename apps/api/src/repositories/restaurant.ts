import { eq } from 'drizzle-orm';
import { restaurants } from '../db/schema/restaurants.js';
import { BaseRepository } from './base.js';

export type RestaurantRow = typeof restaurants.$inferSelect;
export type RestaurantPatch = Partial<typeof restaurants.$inferInsert>;

export class RestaurantRepository extends BaseRepository {
  async findById(id: string): Promise<RestaurantRow | null> {
    const [row] = await this.db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
    return row ?? null;
  }

  async findBySlug(slug: string): Promise<RestaurantRow | null> {
    const [row] = await this.db
      .select()
      .from(restaurants)
      .where(eq(restaurants.slug, slug))
      .limit(1);
    return row ?? null;
  }

  async update(id: string, patch: RestaurantPatch): Promise<RestaurantRow | null> {
    const [row] = await this.db
      .update(restaurants)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return row ?? null;
  }
}
