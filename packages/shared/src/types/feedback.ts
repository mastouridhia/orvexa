import { z } from 'zod';
import { IsoDateTimeSchema, LanguageCodeSchema, UuidSchema } from './common.js';

export const FeedbackSchema = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  tableId: UuidSchema.nullable(),
  orderId: UuidSchema.nullable(),
  sessionId: UuidSchema.nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  locale: LanguageCodeSchema,
  createdAt: IsoDateTimeSchema,
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const SubmitFeedbackRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
export type SubmitFeedbackRequest = z.infer<typeof SubmitFeedbackRequestSchema>;

export const FeedbackListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type FeedbackListQuery = z.infer<typeof FeedbackListQuerySchema>;

export const FeedbackSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  averageRating: z.number().nullable(),
  ratingsBreakdown: z.object({
    1: z.number().int().nonnegative(),
    2: z.number().int().nonnegative(),
    3: z.number().int().nonnegative(),
    4: z.number().int().nonnegative(),
    5: z.number().int().nonnegative(),
  }),
});
export type FeedbackSummary = z.infer<typeof FeedbackSummarySchema>;
