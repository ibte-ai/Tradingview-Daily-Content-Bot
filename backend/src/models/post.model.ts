import { z } from 'zod';

// ─── Post Status Enum ───
export const PostStatus = {
  DRAFT: 'draft',
  CAPTURING: 'capturing',
  ANALYZING: 'analyzing',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  PARTIALLY_PUBLISHED: 'partially_published',
  FAILED: 'failed',
} as const;

export type PostStatusType = typeof PostStatus[keyof typeof PostStatus];

// ─── Platform Publish Result ───
export const PlatformResultSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'whatsapp']),
  status: z.enum(['success', 'failed', 'skipped', 'pending']),
  postId: z.string().optional(),
  postUrl: z.string().optional(),
  errorMessage: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
});

export type PlatformResult = z.infer<typeof PlatformResultSchema>;

// ─── Published Platforms ───
export const PublishedPlatformsSchema = z.object({
  facebook: PlatformResultSchema.optional(),
  instagram: PlatformResultSchema.optional(),
  whatsapp: PlatformResultSchema.optional(),
});

export type PublishedPlatforms = z.infer<typeof PublishedPlatformsSchema>;

// ─── Post Schema ───
export const PostSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string().min(1).max(20),
  status: z.enum([
    'draft', 'capturing', 'analyzing', 'pending_review',
    'approved', 'publishing', 'published', 'partially_published', 'failed',
  ]),
  screenshot_url: z.string().url().nullable(),
  screenshot_local_path: z.string().nullable(),
  ai_analysis: z.any().nullable(),
  caption: z.string().nullable(),
  hashtags: z.array(z.string()).nullable(),
  risk_note: z.string().nullable(),
  published_platforms: PublishedPlatformsSchema.nullable(),
  error_log: z.any().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  approved_at: z.string().datetime().nullable(),
  published_at: z.string().datetime().nullable(),
});

export type Post = z.infer<typeof PostSchema>;

// ─── Create Post Request ───
export const CreatePostSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(20).transform(s => s.toUpperCase()),
  chartUrl: z.string().url().optional(),
  autoAnalyze: z.boolean().default(true),
});

export type CreatePostRequest = z.infer<typeof CreatePostSchema>;

// ─── Update Post Request ───
export const UpdatePostSchema = z.object({
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  risk_note: z.string().optional(),
});

export type UpdatePostRequest = z.infer<typeof UpdatePostSchema>;

// ─── Publish Request ───
export const PublishRequestSchema = z.object({
  platforms: z.array(z.enum(['facebook', 'instagram', 'whatsapp'])).min(1),
  whatsappRecipient: z.string().optional(),
});

export type PublishRequest = z.infer<typeof PublishRequestSchema>;
