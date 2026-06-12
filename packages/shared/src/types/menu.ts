import { z } from 'zod';
import { LocalizedStringSchema, UuidSchema } from './common.js';

export const KitchenSectionSchema = z.enum(['kitchen', 'bar', 'restaurant', 'cafe', 'pizzeria']);
export type KitchenSection = z.infer<typeof KitchenSectionSchema>;

export const CategorySchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  name: LocalizedStringSchema,
  kitchenSection: KitchenSectionSchema.default('kitchen'),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});
export type Category = z.infer<typeof CategorySchema>;

export const VariantSchema = z.object({
  id: UuidSchema,
  groupId: UuidSchema,
  name: LocalizedStringSchema,
  priceDeltaMillimes: z.number().int(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});
export type Variant = z.infer<typeof VariantSchema>;

export const VariantGroupSchema = z.object({
  id: UuidSchema,
  dishId: UuidSchema,
  name: LocalizedStringSchema,
  selectionType: z.enum(['single', 'multi']),
  required: z.boolean(),
  min: z.number().int().nonnegative(),
  max: z.number().int().positive(),
  sortOrder: z.number().int(),
  variants: z.array(VariantSchema).optional(),
});
export type VariantGroup = z.infer<typeof VariantGroupSchema>;

export const DishSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  categoryId: UuidSchema.nullable(),
  name: LocalizedStringSchema,
  description: LocalizedStringSchema.optional(),
  imageUrl: z.url().nullable(),
  imageUrls: z.array(z.url()).default([]),
  priceMillimes: z.number().int().nonnegative(),
  prepTimeMinutes: z.number().int().min(1).max(120).nullable(),
  available: z.boolean(),
  isPlatDuJour: z.boolean().default(false),
  sortOrder: z.number().int(),
  variantGroups: z.array(VariantGroupSchema).optional(),
});
export type Dish = z.infer<typeof DishSchema>;

const TriLangNameSchema = z.object({
  ar: z.string().min(1),
  fr: z.string().min(1),
  en: z.string().min(1),
});

const TriLangDescriptionSchema = z.object({
  ar: z.string(),
  fr: z.string(),
  en: z.string(),
});

export const CreateCategoryRequestSchema = z.object({
  name: TriLangNameSchema,
  kitchenSection: KitchenSectionSchema.optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});
export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;

export const UpdateCategoryRequestSchema = z
  .object({
    name: TriLangNameSchema,
    kitchenSection: KitchenSectionSchema,
    sortOrder: z.number().int().nonnegative(),
    isActive: z.boolean(),
  })
  .partial();
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>;

export const ReorderCategoriesRequestSchema = z.object({
  ids: z.array(UuidSchema).min(1),
});
export type ReorderCategoriesRequest = z.infer<typeof ReorderCategoriesRequestSchema>;

export const CreateDishRequestSchema = z.object({
  categoryId: UuidSchema.nullable().optional(),
  name: TriLangNameSchema,
  description: TriLangDescriptionSchema.optional(),
  priceMillimes: z.number().int().nonnegative(),
  prepTimeMinutes: z.number().int().min(1).max(120).nullable().optional(),
  imageUrl: z.url().nullable().optional(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type CreateDishRequest = z.infer<typeof CreateDishRequestSchema>;

export const UpdateDishRequestSchema = z
  .object({
    categoryId: UuidSchema.nullable(),
    name: TriLangNameSchema,
    description: TriLangDescriptionSchema,
    priceMillimes: z.number().int().nonnegative(),
    prepTimeMinutes: z.number().int().min(1).max(120).nullable(),
    imageUrl: z.url().nullable(),
    available: z.boolean(),
    isPlatDuJour: z.boolean(),
    sortOrder: z.number().int().nonnegative(),
  })
  .partial();
export type UpdateDishRequest = z.infer<typeof UpdateDishRequestSchema>;

export const SetDishAvailabilityRequestSchema = z.object({
  available: z.boolean(),
});
export type SetDishAvailabilityRequest = z.infer<typeof SetDishAvailabilityRequestSchema>;

export const VariantInputSchema = z.object({
  id: UuidSchema.optional(),
  name: TriLangNameSchema,
  priceDeltaMillimes: z.number().int(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type VariantInput = z.infer<typeof VariantInputSchema>;

export const CreateVariantGroupRequestSchema = z.object({
  name: TriLangNameSchema,
  selectionType: z.enum(['single', 'multi']),
  required: z.boolean().optional(),
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().positive().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  variants: z.array(VariantInputSchema).optional(),
});
export type CreateVariantGroupRequest = z.infer<typeof CreateVariantGroupRequestSchema>;

export const UpdateVariantGroupRequestSchema = z
  .object({
    name: TriLangNameSchema,
    selectionType: z.enum(['single', 'multi']),
    required: z.boolean(),
    min: z.number().int().nonnegative(),
    max: z.number().int().positive(),
    sortOrder: z.number().int().nonnegative(),
    variants: z.array(VariantInputSchema),
  })
  .partial();
export type UpdateVariantGroupRequest = z.infer<typeof UpdateVariantGroupRequestSchema>;

export const DishImageUploadResponseSchema = z.object({
  imageUrl: z.url(),
});
export type DishImageUploadResponse = z.infer<typeof DishImageUploadResponseSchema>;
