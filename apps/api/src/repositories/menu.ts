import { and, asc, eq, inArray } from 'drizzle-orm';
import { categories, dishes, variantGroups, variants } from '../db/schema/menu.js';
import { BaseRepository } from './base.js';

export type CategoryRow = typeof categories.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type CategoryPatch = Partial<CategoryInsert>;

export type DishRow = typeof dishes.$inferSelect;
export type DishInsert = typeof dishes.$inferInsert;
export type DishPatch = Partial<DishInsert>;

export type VariantGroupRow = typeof variantGroups.$inferSelect;
export type VariantGroupInsert = typeof variantGroups.$inferInsert;
export type VariantGroupPatch = Partial<VariantGroupInsert>;

export type VariantRow = typeof variants.$inferSelect;
export type VariantInsert = typeof variants.$inferInsert;

export class CategoryRepository extends BaseRepository {
  list(restaurantId: string): Promise<CategoryRow[]> {
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.restaurantId, restaurantId))
      .orderBy(asc(categories.sortOrder), asc(categories.nameFr));
  }

  async findById(id: string): Promise<CategoryRow | null> {
    const [row] = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return row ?? null;
  }

  async create(input: CategoryInsert): Promise<CategoryRow> {
    const [row] = await this.db.insert(categories).values(input).returning();
    if (!row) throw new Error('Failed to insert category');
    return row;
  }

  async update(id: string, patch: CategoryPatch): Promise<CategoryRow | null> {
    const [row] = await this.db
      .update(categories)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    return rows.length > 0;
  }

  async reorder(restaurantId: string, ids: string[]): Promise<CategoryRow[]> {
    return this.db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i += 1) {
        await tx
          .update(categories)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(categories.id, ids[i]!), eq(categories.restaurantId, restaurantId)));
      }
      return tx
        .select()
        .from(categories)
        .where(eq(categories.restaurantId, restaurantId))
        .orderBy(asc(categories.sortOrder));
    });
  }
}

export class DishRepository extends BaseRepository {
  list(restaurantId: string): Promise<DishRow[]> {
    return this.db
      .select()
      .from(dishes)
      .where(eq(dishes.restaurantId, restaurantId))
      .orderBy(asc(dishes.sortOrder), asc(dishes.nameFr));
  }

  listAvailable(restaurantId: string): Promise<DishRow[]> {
    return this.db
      .select()
      .from(dishes)
      .where(and(eq(dishes.restaurantId, restaurantId), eq(dishes.available, true)))
      .orderBy(asc(dishes.sortOrder), asc(dishes.nameFr));
  }

  async findById(id: string): Promise<DishRow | null> {
    const [row] = await this.db.select().from(dishes).where(eq(dishes.id, id)).limit(1);
    return row ?? null;
  }

  async create(input: DishInsert): Promise<DishRow> {
    const [row] = await this.db.insert(dishes).values(input).returning();
    if (!row) throw new Error('Failed to insert dish');
    return row;
  }

  async update(id: string, patch: DishPatch): Promise<DishRow | null> {
    const [row] = await this.db
      .update(dishes)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(dishes.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(dishes)
      .where(eq(dishes.id, id))
      .returning({ id: dishes.id });
    return rows.length > 0;
  }
}

export class VariantGroupRepository extends BaseRepository {
  listForDish(dishId: string): Promise<VariantGroupRow[]> {
    return this.db
      .select()
      .from(variantGroups)
      .where(eq(variantGroups.dishId, dishId))
      .orderBy(asc(variantGroups.sortOrder), asc(variantGroups.nameFr));
  }

  listForDishes(dishIds: string[]): Promise<VariantGroupRow[]> {
    if (dishIds.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(variantGroups)
      .where(inArray(variantGroups.dishId, dishIds))
      .orderBy(asc(variantGroups.sortOrder));
  }

  async findById(id: string): Promise<VariantGroupRow | null> {
    const [row] = await this.db
      .select()
      .from(variantGroups)
      .where(eq(variantGroups.id, id))
      .limit(1);
    return row ?? null;
  }

  async create(input: VariantGroupInsert): Promise<VariantGroupRow> {
    const [row] = await this.db.insert(variantGroups).values(input).returning();
    if (!row) throw new Error('Failed to insert variant_group');
    return row;
  }

  async update(id: string, patch: VariantGroupPatch): Promise<VariantGroupRow | null> {
    const [row] = await this.db
      .update(variantGroups)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(variantGroups.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(variantGroups)
      .where(eq(variantGroups.id, id))
      .returning({ id: variantGroups.id });
    return rows.length > 0;
  }
}

export class VariantRepository extends BaseRepository {
  listForGroup(groupId: string): Promise<VariantRow[]> {
    return this.db
      .select()
      .from(variants)
      .where(eq(variants.groupId, groupId))
      .orderBy(asc(variants.sortOrder), asc(variants.nameFr));
  }

  listForGroups(groupIds: string[]): Promise<VariantRow[]> {
    if (groupIds.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(variants)
      .where(inArray(variants.groupId, groupIds))
      .orderBy(asc(variants.sortOrder));
  }

  async insertMany(rows: VariantInsert[]): Promise<VariantRow[]> {
    if (rows.length === 0) return [];
    return this.db.insert(variants).values(rows).returning();
  }

  async deleteForGroup(groupId: string): Promise<void> {
    await this.db.delete(variants).where(eq(variants.groupId, groupId));
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.delete(variants).where(inArray(variants.id, ids));
  }

  async upsertVariantsForGroup(
    groupId: string,
    inputs: { id?: string; row: VariantInsert }[],
  ): Promise<VariantRow[]> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: variants.id })
        .from(variants)
        .where(eq(variants.groupId, groupId));
      const incomingIds = new Set(inputs.map((i) => i.id).filter((id): id is string => !!id));
      const toDelete = existing.map((e) => e.id).filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.delete(variants).where(inArray(variants.id, toDelete));
      }
      const result: VariantRow[] = [];
      for (const item of inputs) {
        if (item.id) {
          const [updated] = await tx
            .update(variants)
            .set({ ...item.row, updatedAt: new Date() })
            .where(and(eq(variants.id, item.id), eq(variants.groupId, groupId)))
            .returning();
          if (updated) result.push(updated);
        } else {
          const [created] = await tx
            .insert(variants)
            .values({ ...item.row, groupId })
            .returning();
          if (created) result.push(created);
        }
      }
      return result.sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }
}

