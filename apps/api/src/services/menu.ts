import type {
  Category,
  CreateCategoryRequest,
  CreateDishRequest,
  CreateVariantGroupRequest,
  Dish,
  ReorderCategoriesRequest,
  SetDishAvailabilityRequest,
  UpdateCategoryRequest,
  UpdateDishRequest,
  UpdateVariantGroupRequest,
  Variant,
  VariantGroup,
} from '@orvexa/shared';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import {
  CategoryRepository,
  DishRepository,
  VariantGroupRepository,
  VariantRepository,
  type CategoryRow,
  type DishRow,
  type VariantGroupRow,
  type VariantRow,
} from '../repositories/menu.js';

export function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: { ar: row.nameAr, fr: row.nameFr, en: row.nameEn },
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function rowToVariant(row: VariantRow): Variant {
  return {
    id: row.id,
    groupId: row.groupId,
    name: { ar: row.nameAr, fr: row.nameFr, en: row.nameEn },
    priceDeltaMillimes: row.priceDeltaMillimes,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function rowToVariantGroup(row: VariantGroupRow, variants: VariantRow[] = []): VariantGroup {
  return {
    id: row.id,
    dishId: row.dishId,
    name: { ar: row.nameAr, fr: row.nameFr, en: row.nameEn },
    selectionType: row.selectionType,
    required: row.required,
    min: row.minChoices,
    max: row.maxChoices,
    sortOrder: row.sortOrder,
    variants: variants.map(rowToVariant),
  };
}

export function rowToDish(row: DishRow, groups: VariantGroup[] = []): Dish {
  const description =
    row.descriptionAr || row.descriptionFr || row.descriptionEn
      ? {
          ar: row.descriptionAr ?? '',
          fr: row.descriptionFr ?? '',
          en: row.descriptionEn ?? '',
        }
      : undefined;
  const imageUrls = (row.imageUrls ?? []).filter(Boolean);
  const legacyUrls = row.imageUrl ? [row.imageUrl] : [];
  const allUrls = imageUrls.length > 0 ? imageUrls : legacyUrls;
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    categoryId: row.categoryId ?? null,
    name: { ar: row.nameAr, fr: row.nameFr, en: row.nameEn },
    ...(description ? { description } : {}),
    imageUrl: allUrls[0] ?? null,
    imageUrls: allUrls,
    priceMillimes: row.priceMillimes,
    prepTimeMinutes: row.prepTimeMinutes ?? null,
    available: row.available,
    sortOrder: row.sortOrder,
    variantGroups: groups,
  };
}

export type MenuTreeCategory = Category & { dishes: Dish[] };

export class MenuService {
  private readonly categoryRepo: CategoryRepository;
  private readonly dishRepo: DishRepository;
  private readonly variantGroupRepo: VariantGroupRepository;
  private readonly variantRepo: VariantRepository;

  constructor(
    categoryRepo: CategoryRepository = new CategoryRepository(),
    dishRepo: DishRepository = new DishRepository(),
    variantGroupRepo: VariantGroupRepository = new VariantGroupRepository(),
    variantRepo: VariantRepository = new VariantRepository(),
  ) {
    this.categoryRepo = categoryRepo;
    this.dishRepo = dishRepo;
    this.variantGroupRepo = variantGroupRepo;
    this.variantRepo = variantRepo;
  }

  async getPublicMenu(restaurantId: string): Promise<MenuTreeCategory[]> {
    const [allCategories, availableDishes] = await Promise.all([
      this.categoryRepo.list(restaurantId),
      this.dishRepo.listAvailable(restaurantId),
    ]);
    const dishIds = availableDishes.map((d) => d.id);
    const groups = await this.variantGroupRepo.listForDishes(dishIds);
    const variants = await this.variantRepo.listForGroups(groups.map((g) => g.id));

    const variantsByGroup = new Map<string, VariantRow[]>();
    for (const v of variants) {
      if (!v.isActive) continue;
      const list = variantsByGroup.get(v.groupId) ?? [];
      list.push(v);
      variantsByGroup.set(v.groupId, list);
    }
    const groupsByDish = new Map<string, VariantGroup[]>();
    for (const g of groups) {
      const groupVariants = variantsByGroup.get(g.id) ?? [];
      const list = groupsByDish.get(g.dishId) ?? [];
      list.push(rowToVariantGroup(g, groupVariants));
      groupsByDish.set(g.dishId, list);
    }
    const dishesByCategory = new Map<string | null, Dish[]>();
    for (const d of availableDishes) {
      const dishGroups = groupsByDish.get(d.id) ?? [];
      const list = dishesByCategory.get(d.categoryId) ?? [];
      list.push(rowToDish(d, dishGroups));
      dishesByCategory.set(d.categoryId, list);
    }

    return allCategories
      .filter((c) => c.isActive)
      .map((c) => ({
        ...rowToCategory(c),
        dishes: dishesByCategory.get(c.id) ?? [],
      }));
  }

  // ───────── Categories ─────────

  async listCategories(restaurantId: string): Promise<Category[]> {
    const rows = await this.categoryRepo.list(restaurantId);
    return rows.map(rowToCategory);
  }

  async createCategory(restaurantId: string, input: CreateCategoryRequest): Promise<Category> {
    const row = await this.categoryRepo.create({
      restaurantId,
      nameAr: input.name.ar,
      nameFr: input.name.fr,
      nameEn: input.name.en,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    });
    return rowToCategory(row);
  }

  async updateCategory(
    restaurantId: string,
    id: string,
    input: UpdateCategoryRequest,
  ): Promise<Category> {
    const existing = await this.categoryRepo.findById(id);
    if (!existing) throw new NotFoundError('Category not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const patch: Parameters<CategoryRepository['update']>[1] = {};
    if (input.name) {
      patch.nameAr = input.name.ar;
      patch.nameFr = input.name.fr;
      patch.nameEn = input.name.en;
    }
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    const row = await this.categoryRepo.update(id, patch);
    if (!row) throw new NotFoundError('Category not found');
    return rowToCategory(row);
  }

  async deleteCategory(restaurantId: string, id: string): Promise<void> {
    const existing = await this.categoryRepo.findById(id);
    if (!existing) throw new NotFoundError('Category not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    await this.categoryRepo.delete(id);
  }

  async reorderCategories(
    restaurantId: string,
    input: ReorderCategoriesRequest,
  ): Promise<Category[]> {
    const owned = await this.categoryRepo.list(restaurantId);
    const ownedIds = new Set(owned.map((c) => c.id));
    const unknown = input.ids.filter((id) => !ownedIds.has(id));
    if (unknown.length > 0) {
      throw new ValidationError('Unknown category ids', { ids: unknown });
    }
    const rows = await this.categoryRepo.reorder(restaurantId, input.ids);
    return rows.map(rowToCategory);
  }

  // ───────── Dishes ─────────

  async listDishes(restaurantId: string): Promise<Dish[]> {
    const rows = await this.dishRepo.list(restaurantId);
    if (rows.length === 0) return [];
    const groups = await this.variantGroupRepo.listForDishes(rows.map((r) => r.id));
    const groupVariants = await this.variantRepo.listForGroups(groups.map((g) => g.id));
    const variantsByGroup = new Map<string, VariantRow[]>();
    for (const v of groupVariants) {
      const list = variantsByGroup.get(v.groupId) ?? [];
      list.push(v);
      variantsByGroup.set(v.groupId, list);
    }
    const groupsByDish = new Map<string, VariantGroup[]>();
    for (const g of groups) {
      const list = groupsByDish.get(g.dishId) ?? [];
      list.push(rowToVariantGroup(g, variantsByGroup.get(g.id) ?? []));
      groupsByDish.set(g.dishId, list);
    }
    return rows.map((r) => rowToDish(r, groupsByDish.get(r.id) ?? []));
  }

  async getDish(restaurantId: string, id: string): Promise<Dish> {
    const row = await this.dishRepo.findById(id);
    if (!row) throw new NotFoundError('Dish not found');
    if (row.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const groups = await this.variantGroupRepo.listForDish(id);
    const groupVariants = await this.variantRepo.listForGroups(groups.map((g) => g.id));
    const variantsByGroup = new Map<string, VariantRow[]>();
    for (const v of groupVariants) {
      const list = variantsByGroup.get(v.groupId) ?? [];
      list.push(v);
      variantsByGroup.set(v.groupId, list);
    }
    return rowToDish(
      row,
      groups.map((g) => rowToVariantGroup(g, variantsByGroup.get(g.id) ?? [])),
    );
  }

  async createDish(restaurantId: string, input: CreateDishRequest): Promise<Dish> {
    if (input.categoryId) {
      const category = await this.categoryRepo.findById(input.categoryId);
      if (!category || category.restaurantId !== restaurantId) {
        throw new ValidationError('categoryId does not belong to this restaurant');
      }
    }
    const row = await this.dishRepo.create({
      restaurantId,
      categoryId: input.categoryId ?? null,
      nameAr: input.name.ar,
      nameFr: input.name.fr,
      nameEn: input.name.en,
      descriptionAr: input.description?.ar ?? null,
      descriptionFr: input.description?.fr ?? null,
      descriptionEn: input.description?.en ?? null,
      imageUrl: input.imageUrl ?? null,
      priceMillimes: input.priceMillimes,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      available: input.available ?? true,
      sortOrder: input.sortOrder ?? 0,
    });
    return rowToDish(row, []);
  }

  async updateDish(restaurantId: string, id: string, input: UpdateDishRequest): Promise<Dish> {
    const existing = await this.dishRepo.findById(id);
    if (!existing) throw new NotFoundError('Dish not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    if (input.categoryId !== undefined && input.categoryId !== null) {
      const category = await this.categoryRepo.findById(input.categoryId);
      if (!category || category.restaurantId !== restaurantId) {
        throw new ValidationError('categoryId does not belong to this restaurant');
      }
    }
    const patch: Parameters<DishRepository['update']>[1] = {};
    if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
    if (input.name) {
      patch.nameAr = input.name.ar;
      patch.nameFr = input.name.fr;
      patch.nameEn = input.name.en;
    }
    if (input.description) {
      patch.descriptionAr = input.description.ar;
      patch.descriptionFr = input.description.fr;
      patch.descriptionEn = input.description.en;
    }
    if (input.priceMillimes !== undefined) patch.priceMillimes = input.priceMillimes;
    if (input.prepTimeMinutes !== undefined) patch.prepTimeMinutes = input.prepTimeMinutes;
    if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
    if (input.available !== undefined) patch.available = input.available;
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    const row = await this.dishRepo.update(id, patch);
    if (!row) throw new NotFoundError('Dish not found');
    return this.getDish(restaurantId, row.id);
  }

  async setDishAvailability(
    restaurantId: string,
    id: string,
    input: SetDishAvailabilityRequest,
  ): Promise<Dish> {
    const existing = await this.dishRepo.findById(id);
    if (!existing) throw new NotFoundError('Dish not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const row = await this.dishRepo.update(id, { available: input.available });
    if (!row) throw new NotFoundError('Dish not found');
    return rowToDish(row, []);
  }

  async deleteDish(restaurantId: string, id: string): Promise<void> {
    const existing = await this.dishRepo.findById(id);
    if (!existing) throw new NotFoundError('Dish not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    await this.dishRepo.delete(id);
  }

  async setDishImage(restaurantId: string, id: string, imageUrl: string | null): Promise<Dish> {
    const existing = await this.dishRepo.findById(id);
    if (!existing) throw new NotFoundError('Dish not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const urls = imageUrl ? [imageUrl] : [];
    const row = await this.dishRepo.update(id, { imageUrl, imageUrls: urls });
    if (!row) throw new NotFoundError('Dish not found');
    return rowToDish(row, []);
  }

  async addDishImage(restaurantId: string, id: string, imageUrl: string): Promise<Dish> {
    const existing = await this.dishRepo.findById(id);
    if (!existing) throw new NotFoundError('Dish not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const nextUrls = [...(existing.imageUrls ?? []), imageUrl];
    const row = await this.dishRepo.update(id, {
      imageUrls: nextUrls,
      imageUrl: existing.imageUrl ?? nextUrls[0] ?? null,
    });
    if (!row) throw new NotFoundError('Dish not found');
    return rowToDish(row, []);
  }

  async removeDishImageAt(restaurantId: string, id: string, idx: number): Promise<{ dish: Dish; removedUrl: string | null }> {
    const existing = await this.dishRepo.findById(id);
    if (!existing) throw new NotFoundError('Dish not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const urls = [...(existing.imageUrls ?? [])];
    const removed = urls.splice(idx, 1)[0] ?? null;
    const row = await this.dishRepo.update(id, {
      imageUrls: urls,
      imageUrl: urls[0] ?? null,
    });
    if (!row) throw new NotFoundError('Dish not found');
    return { dish: rowToDish(row, []), removedUrl: removed };
  }

  // ───────── Variant Groups ─────────

  async listVariantGroups(restaurantId: string, dishId: string): Promise<VariantGroup[]> {
    const dish = await this.dishRepo.findById(dishId);
    if (!dish) throw new NotFoundError('Dish not found');
    if (dish.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const groups = await this.variantGroupRepo.listForDish(dishId);
    const groupVariants = await this.variantRepo.listForGroups(groups.map((g) => g.id));
    const variantsByGroup = new Map<string, VariantRow[]>();
    for (const v of groupVariants) {
      const list = variantsByGroup.get(v.groupId) ?? [];
      list.push(v);
      variantsByGroup.set(v.groupId, list);
    }
    return groups.map((g) => rowToVariantGroup(g, variantsByGroup.get(g.id) ?? []));
  }

  async createVariantGroup(
    restaurantId: string,
    dishId: string,
    input: CreateVariantGroupRequest,
  ): Promise<VariantGroup> {
    const dish = await this.dishRepo.findById(dishId);
    if (!dish) throw new NotFoundError('Dish not found');
    if (dish.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const required = input.required ?? false;
    const minChoices = input.min ?? (required ? 1 : 0);
    const maxChoices =
      input.max ?? (input.selectionType === 'multi' ? 99 : 1);
    this.assertChoiceConstraints(input.selectionType, minChoices, maxChoices);
    const row = await this.variantGroupRepo.create({
      dishId,
      nameAr: input.name.ar,
      nameFr: input.name.fr,
      nameEn: input.name.en,
      selectionType: input.selectionType,
      required,
      minChoices,
      maxChoices,
      sortOrder: input.sortOrder ?? 0,
    });
    let variants: VariantRow[] = [];
    if (input.variants && input.variants.length > 0) {
      variants = await this.variantRepo.insertMany(
        input.variants.map((v, idx) => ({
          groupId: row.id,
          nameAr: v.name.ar,
          nameFr: v.name.fr,
          nameEn: v.name.en,
          priceDeltaMillimes: v.priceDeltaMillimes,
          isActive: v.isActive ?? true,
          sortOrder: v.sortOrder ?? idx,
        })),
      );
    }
    return rowToVariantGroup(row, variants);
  }

  async updateVariantGroup(
    restaurantId: string,
    id: string,
    input: UpdateVariantGroupRequest,
  ): Promise<VariantGroup> {
    const existing = await this.variantGroupRepo.findById(id);
    if (!existing) throw new NotFoundError('Variant group not found');
    const dish = await this.dishRepo.findById(existing.dishId);
    if (!dish || dish.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const selectionType = input.selectionType ?? existing.selectionType;
    const min = input.min ?? existing.minChoices;
    const max = input.max ?? existing.maxChoices;
    this.assertChoiceConstraints(selectionType, min, max);
    const patch: Parameters<VariantGroupRepository['update']>[1] = {};
    if (input.name) {
      patch.nameAr = input.name.ar;
      patch.nameFr = input.name.fr;
      patch.nameEn = input.name.en;
    }
    if (input.selectionType !== undefined) patch.selectionType = input.selectionType;
    if (input.required !== undefined) patch.required = input.required;
    if (input.min !== undefined) patch.minChoices = input.min;
    if (input.max !== undefined) patch.maxChoices = input.max;
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    await this.variantGroupRepo.update(id, patch);

    if (input.variants !== undefined) {
      await this.variantRepo.upsertVariantsForGroup(
        id,
        input.variants.map((v, idx) => ({
          ...(v.id !== undefined ? { id: v.id } : {}),
          row: {
            groupId: id,
            nameAr: v.name.ar,
            nameFr: v.name.fr,
            nameEn: v.name.en,
            priceDeltaMillimes: v.priceDeltaMillimes,
            isActive: v.isActive ?? true,
            sortOrder: v.sortOrder ?? idx,
          },
        })),
      );
    }

    const refreshed = await this.variantGroupRepo.findById(id);
    if (!refreshed) throw new NotFoundError('Variant group not found');
    const variants = await this.variantRepo.listForGroup(id);
    return rowToVariantGroup(refreshed, variants);
  }

  async deleteVariantGroup(restaurantId: string, id: string): Promise<void> {
    const existing = await this.variantGroupRepo.findById(id);
    if (!existing) throw new NotFoundError('Variant group not found');
    const dish = await this.dishRepo.findById(existing.dishId);
    if (!dish || dish.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    await this.variantGroupRepo.delete(id);
  }

  private assertChoiceConstraints(
    selectionType: 'single' | 'multi',
    min: number,
    max: number,
  ): void {
    if (max < min) throw new ValidationError('max must be >= min');
    if (selectionType === 'single' && max > 1) {
      throw new ValidationError('single-selection groups must have max=1');
    }
  }
}
