import { z } from 'zod';
import {
  POST_GENERAL_PERMISSIONS,
  POST_SOURCE_PERMISSIONS,
  POST_VISIBILITIES,
} from '@/domains/posts/model';

const optionalVisibilitySchema = z.union([z.literal(''), z.enum(POST_VISIBILITIES)]);
const optionalGeneralPermissionSchema = z.union([z.literal(''), z.enum(POST_GENERAL_PERMISSIONS)]);
const optionalSourcePermissionSchema = z.union([z.literal(''), z.enum(POST_SOURCE_PERMISSIONS)]);

export const composeEditorSchema = z.object({
  content: z.string().max(1000, '最多 1000 个字符'),
  communityId: z.string(),
  visibility: optionalVisibilitySchema,
  commentPermission: optionalGeneralPermissionSchema,
  quotePermission: optionalSourcePermissionSchema,
  repostPermission: optionalSourcePermissionSchema,
});

export type ComposeEditorValues = z.infer<typeof composeEditorSchema>;
