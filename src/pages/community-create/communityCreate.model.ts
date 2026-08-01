import { z } from 'zod';
import {
  COMMUNITY_COMMENT_ROLES,
  COMMUNITY_JOIN_POLICIES,
  COMMUNITY_MAX_RULE_COUNT,
  COMMUNITY_MAX_RULE_LENGTH,
  COMMUNITY_MAX_TAG_COUNT,
  COMMUNITY_MAX_TAG_LENGTH,
  COMMUNITY_POST_ROLES,
} from '@/domains/communities/model';

export const communityCreateSchema = z
  .object({
    name: z.string().trim().min(2, '至少 2 个字符').max(64, '最多 64 个字符'),
    slug: z
      .string()
      .trim()
      .min(3, '至少 3 个字符')
      .max(32, '最多 32 个字符')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        '仅支持小写字母、数字和单个连字符，且不能以连字符开头或结尾',
      ),
    description: z.string().trim().max(500, '最多 500 个字符'),
    categoryKey: z.string().trim().max(64),
    tagsText: z.string(),
    locale: z.string().trim().max(16),
    regionCode: z.string().trim().max(16),
    joinPolicy: z.enum(COMMUNITY_JOIN_POLICIES),
    postRoleMin: z.enum(COMMUNITY_POST_ROLES),
    commentRoleMin: z.enum(COMMUNITY_COMMENT_ROLES),
    quoteEnabled: z.boolean(),
    repostEnabled: z.boolean(),
    requireRuleAcceptanceBeforePost: z.boolean(),
    rules: z
      .array(
        z.object({
          content: z.string().trim().min(1, '规则内容不能为空').max(
            COMMUNITY_MAX_RULE_LENGTH,
            `每条规则最多 ${COMMUNITY_MAX_RULE_LENGTH} 个字符`,
          ),
        }),
      )
      .max(COMMUNITY_MAX_RULE_COUNT, `最多 ${COMMUNITY_MAX_RULE_COUNT} 条规则`),
  })
  .superRefine((values, context) => {
    const tags = parseCommunityTags(values.tagsText);
    if (tags.length > COMMUNITY_MAX_TAG_COUNT) {
      context.addIssue({
        code: 'custom',
        path: ['tagsText'],
        message: `最多 ${COMMUNITY_MAX_TAG_COUNT} 个标签`,
      });
    }
    if (tags.some((tag) => tag.length > COMMUNITY_MAX_TAG_LENGTH)) {
      context.addIssue({
        code: 'custom',
        path: ['tagsText'],
        message: `每个标签最多 ${COMMUNITY_MAX_TAG_LENGTH} 个字符`,
      });
    }
  });

export type CommunityCreateFormValues = z.infer<typeof communityCreateSchema>;

export const COMMUNITY_CREATE_DEFAULT_VALUES: CommunityCreateFormValues = {
  name: '',
  slug: '',
  description: '',
  categoryKey: '',
  tagsText: '',
  locale: 'zh-CN',
  regionCode: '',
  joinPolicy: 'OPEN',
  postRoleMin: 'MEMBER',
  commentRoleMin: 'VISITOR',
  quoteEnabled: true,
  repostEnabled: true,
  requireRuleAcceptanceBeforePost: false,
  rules: [],
};

export function parseCommunityTags(rawValue: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  rawValue.split(/[,，\n]/).forEach((candidate) => {
    const tag = candidate.trim();
    if (!tag || seen.has(tag)) return;
    seen.add(tag);
    result.push(tag);
  });
  return result;
}
