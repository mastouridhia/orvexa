import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, resetTransactionalState, fullResetAndReseed, loadSeededIds } from '../helpers/db.js';
import { dishes, categories } from '../../src/db/schema/menu.js';
import { MenuService } from '../../src/services/menu.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../src/utils/errors.js';

const service = new MenuService();

describe('MenuService.getPublicMenu', () => {
  beforeEach(async () => {
    await resetTransactionalState();
  });

  it('returns categories with their dishes and variant groups composed', async () => {
    const ids = await loadSeededIds();
    const tree = await service.getPublicMenu(ids.restaurantId);
    expect(tree).toHaveLength(3);
    const starters = tree.find((c) => c.name.en === 'Starters');
    expect(starters?.dishes).toHaveLength(2);

    const drinks = tree.find((c) => c.name.en === 'Drinks');
    const water = drinks?.dishes.find((d) => d.name.en === 'Mineral Water');
    expect(water?.variantGroups).toHaveLength(1);
    expect(water?.variantGroups?.[0]?.variants?.length ?? 0).toBeGreaterThan(0);
  });

  it('omits dishes flagged as unavailable', async () => {
    const ids = await loadSeededIds();
    await db.update(dishes).set({ available: false }).where(eq(dishes.id, ids.dishIds.brik));
    const tree = await service.getPublicMenu(ids.restaurantId);
    const starters = tree.find((c) => c.name.en === 'Starters');
    expect(starters?.dishes.find((d) => d.name.en === 'Egg Brik')).toBeUndefined();
  });

  it('omits inactive categories', async () => {
    const ids = await loadSeededIds();
    await db
      .update(categories)
      .set({ isActive: false })
      .where(eq(categories.id, ids.categoryIds.drinks));
    const tree = await service.getPublicMenu(ids.restaurantId);
    expect(tree.find((c) => c.name.en === 'Drinks')).toBeUndefined();
  });
});

describe('MenuService — categories CRUD', () => {
  beforeEach(async () => {
    await fullResetAndReseed();
  });

  it('create then update flips fields and preserves id', async () => {
    const ids = await loadSeededIds();
    const created = await service.createCategory(ids.restaurantId, {
      name: { ar: 'حلويات', fr: 'Desserts', en: 'Desserts' },
      sortOrder: 5,
    });
    expect(created.name.fr).toBe('Desserts');

    const updated = await service.updateCategory(ids.restaurantId, created.id, {
      name: { ar: 'حلويات', fr: 'Sucreries', en: 'Sweets' },
    });
    expect(updated.id).toBe(created.id);
    expect(updated.name.en).toBe('Sweets');
  });

  it('cross-restaurant update is forbidden', async () => {
    const ids = await loadSeededIds();
    await expect(
      service.updateCategory('11111111-1111-1111-1111-111111111111', ids.categoryIds.starters, {
        name: { ar: 'x', fr: 'x', en: 'x' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('reorderCategories rejects unknown ids', async () => {
    const ids = await loadSeededIds();
    await expect(
      service.reorderCategories(ids.restaurantId, {
        ids: [ids.categoryIds.starters, '00000000-0000-0000-0000-000000000fff'],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('reorderCategories returns categories in the requested order', async () => {
    const ids = await loadSeededIds();
    const reordered = await service.reorderCategories(ids.restaurantId, {
      ids: [ids.categoryIds.drinks, ids.categoryIds.mains, ids.categoryIds.starters],
    });
    expect(reordered.map((c) => c.id)).toEqual([
      ids.categoryIds.drinks,
      ids.categoryIds.mains,
      ids.categoryIds.starters,
    ]);
  });
});

describe('MenuService — dishes', () => {
  beforeEach(async () => {
    await fullResetAndReseed();
  });

  it('createDish rejects a categoryId from a different restaurant', async () => {
    const ids = await loadSeededIds();
    await expect(
      service.createDish('11111111-1111-1111-1111-111111111111', {
        categoryId: ids.categoryIds.starters,
        name: { ar: 'x', fr: 'x', en: 'x' },
        priceMillimes: 1000,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('getDish 404s for unknown id', async () => {
    const ids = await loadSeededIds();
    await expect(
      service.getDish(ids.restaurantId, '00000000-0000-0000-0000-000000000fff'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('placeholder for future variant-group conflict surface', () => {
    expect(ConflictError).toBeDefined();
  });
});
