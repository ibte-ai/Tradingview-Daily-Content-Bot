import { z } from 'zod';

export const AuditActionSchema = z.enum([
  'post_created',
  'screenshot_captured',
  'screenshot_failed',
  'ai_analyzed',
  'ai_analysis_failed',
  'caption_generated',
  'caption_edited',
  'post_approved',
  'publish_started',
  'published_facebook',
  'published_instagram',
  'published_whatsapp',
  'publish_failed_facebook',
  'publish_failed_instagram',
  'publish_failed_whatsapp',
  'post_retried',
  'post_deleted',
  'settings_updated',
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export interface AuditLog {
  id: string;
  post_id: string | null;
  action: AuditAction;
  details: Record<string, unknown>;
  status: 'success' | 'failure' | 'retry';
  error_message: string | null;
  created_at: string;
}

export const CreateAuditLogSchema = z.object({
  post_id: z.string().uuid().nullable(),
  action: AuditActionSchema,
  details: z.record(z.unknown()).default({}),
  status: z.enum(['success', 'failure', 'retry']),
  error_message: z.string().nullable().default(null),
});

export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;
