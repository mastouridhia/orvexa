import { z } from 'zod';
import { LanguageCodeSchema } from './common.js';
import { StaffUserSchema } from './staff.js';

export const StaffLoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  restaurantSlug: z.string().min(1).optional(),
});
export type StaffLoginRequest = z.infer<typeof StaffLoginRequestSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const StaffLoginResponseSchema = AuthTokensSchema.extend({
  user: StaffUserSchema,
});
export type StaffLoginResponse = z.infer<typeof StaffLoginResponseSchema>;

export const StaffRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type StaffRefreshRequest = z.infer<typeof StaffRefreshRequestSchema>;

export const OpenCustomerSessionRequestSchema = z.object({
  qrToken: z.string().min(1),
  locale: LanguageCodeSchema,
});
export type OpenCustomerSessionRequest = z.infer<typeof OpenCustomerSessionRequestSchema>;
