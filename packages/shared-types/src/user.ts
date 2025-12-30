import { z } from 'zod';

export const SubscriptionTierSchema = z.enum(['free', 'basic', 'pro']);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultTags: z.array(z.string()).optional(),
  reminderTime: z.string().optional(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  subscriptionTier: SubscriptionTierSchema,
  subscriptionExpiresAt: z.date().nullable(),
  aiQueriesUsed: z.number().int().min(0),
  aiQueriesResetAt: z.date().nullable(),
  storageUsedBytes: z.number().int().min(0),
  notesCount: z.number().int().min(0),
  preferences: UserPreferencesSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  lastActiveAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  preferences: UserPreferencesSchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;
