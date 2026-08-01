import { z } from 'zod';
import {
  POST_GENERAL_PERMISSIONS,
  POST_SOURCE_PERMISSIONS,
  POST_VISIBILITIES,
  type PostComposeInput,
  type PostDraftComposeView,
  type PostGeneralPermission,
  type PostSourcePermission,
  type PostVisibility,
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

export const DEFAULT_COMPOSE_EDITOR_VALUES: ComposeEditorValues = {
  content: '',
  communityId: '',
  visibility: '',
  commentPermission: '',
  quotePermission: '',
  repostPermission: '',
};

export function draftComposeToEditorValues(compose: PostDraftComposeView): ComposeEditorValues {
  return {
    content: compose.bodyText ?? '',
    communityId: compose.communityId ?? '',
    visibility: compose.visibility ?? '',
    commentPermission: compose.commentPermission ?? '',
    quotePermission: compose.quotePermission ?? '',
    repostPermission: compose.repostPermission ?? '',
  };
}

export function optionalVisibility(
  value: ComposeEditorValues['visibility'],
): PostVisibility | null {
  return value || null;
}

export function optionalGeneralPermission(
  value: ComposeEditorValues['commentPermission'],
): PostGeneralPermission | null {
  return value || null;
}

export function optionalSourcePermission(
  value: ComposeEditorValues['quotePermission'],
): PostSourcePermission | null {
  return value || null;
}

export function getDraftMediaAssetIds(compose: PostComposeInput): string[] {
  return [...compose.mediaItems]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => item.mediaAssetId);
}
