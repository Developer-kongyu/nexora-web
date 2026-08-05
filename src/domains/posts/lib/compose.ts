import type {
  PostComposeEntityRangeInput,
  PostComposeInput,
  PostComposeMediaItemInput,
  PostGeneralPermission,
  PostSourcePermission,
  PostVisibility,
} from '../model/types';

export const POST_COMPOSER_META = {
  editorKind: 'TEXTAREA',
  textIndexUnit: 'UTF16_CODE_UNIT',
  normalizationVersion: 'POST_TEXT_NORMALIZATION_V1',
} as const;

const HTTP_URL_PATTERN = /https?:\/\/[^\s<>{}\[\]"'，。！？；：、“”‘’]+/giu;
const URL_TERMINAL_PUNCTUATION_PATTERN = /[.,!?;:，。！？；：、"'“”‘’]+$/u;
const MENTION_PATTERN = /(^|[\s(\[（【{，。！？、；："'“‘])@([A-Za-z0-9_]{1,30})/gu;
const HASHTAG_PATTERN = /(^|[\s(\[（【{，。！？、；："'“‘])#([\p{L}\p{N}_]{1,50})/gu;

export interface BuildPostComposeInputOptions {
  bodyText: string;
  mediaAssetIds: readonly string[];
  visibility: PostVisibility | null;
  communityId?: string | null;
  likePermission?: PostGeneralPermission | null;
  bookmarkPermission?: PostGeneralPermission | null;
  commentPermission?: PostGeneralPermission | null;
  quotePermission?: PostSourcePermission | null;
  repostPermission?: PostSourcePermission | null;
  placeId?: string | null;
  placeName?: string | null;
  replyToPostId?: string | null;
  quoteOfPostId?: string | null;
  repostOfPostId?: string | null;
  linkCardDisabled?: boolean;
}
export interface PostHttpUrlRange {
  entityType: 'LINK';
  url: string;
  startOffset: number;
  endOffset: number;
}

export function normalizePostBodyText(value: string): string | null {
  const normalized = value.replace(/\r\n?/gu, '\n').trim();
  return normalized || null;
}

export function extractFirstHttpUrl(value: string): string | null {
  return buildPostHttpUrlRanges(value)[0]?.url ?? null;
}

export function buildPostHttpUrlRanges(value: string): PostHttpUrlRange[] {
  const ranges: PostHttpUrlRange[] = [];

  for (const match of value.matchAll(HTTP_URL_PATTERN)) {
    if (match.index === undefined) continue;
    const url = match[0].replace(URL_TERMINAL_PUNCTUATION_PATTERN, '');
    if (!url) continue;
    ranges.push({
      entityType: 'LINK',
      url,
      startOffset: match.index,
      endOffset: match.index + url.length,
    });
  }

  return ranges;
}

export function buildPostComposeEntityRanges(bodyText: string): PostComposeEntityRangeInput[] {
  const ranges: PostComposeEntityRangeInput[] = [];

  for (const match of bodyText.matchAll(MENTION_PATTERN)) {
    const prefix = match[1] ?? '';
    const handle = match[2];
    if (!handle || match.index === undefined) continue;
    const startOffset = match.index + prefix.length;
    const displayText = `@${handle}`;
    ranges.push({
      entityType: 'MENTION',
      mentionedUserId: null,
      handleSnapshot: handle,
      displayText,
      startOffset,
      endOffset: startOffset + displayText.length,
    });
  }

  for (const match of bodyText.matchAll(HASHTAG_PATTERN)) {
    const prefix = match[1] ?? '';
    const tagTextSnapshot = match[2];
    if (!tagTextSnapshot || match.index === undefined) continue;
    const startOffset = match.index + prefix.length;
    ranges.push({
      entityType: 'HASHTAG',
      tagTextSnapshot,
      startOffset,
      endOffset: startOffset + tagTextSnapshot.length + 1,
    });
  }

  return ranges.sort((left, right) => left.startOffset - right.startOffset);
}

export function buildPostComposeMediaItems(
  mediaAssetIds: readonly string[],
): PostComposeMediaItemInput[] {
  return mediaAssetIds.map((mediaAssetId, sortOrder) => ({
    mediaAssetId,
    title: null,
    description: null,
    sortOrder,
  }));
}

export function buildPostComposeInput(options: BuildPostComposeInputOptions): PostComposeInput {
  const bodyText = normalizePostBodyText(options.bodyText);

  return {
    bodyText,
    mediaItems: buildPostComposeMediaItems(options.mediaAssetIds),
    entityRanges: bodyText ? buildPostComposeEntityRanges(bodyText) : [],
    linkUrl: bodyText ? extractFirstHttpUrl(bodyText) : null,
    linkCardDisabled: options.linkCardDisabled ?? false,
    visibility: options.visibility,
    likePermission: options.likePermission ?? null,
    bookmarkPermission: options.bookmarkPermission ?? null,
    commentPermission: options.commentPermission ?? null,
    quotePermission: options.quotePermission ?? null,
    repostPermission: options.repostPermission ?? null,
    communityId: options.communityId || null,
    placeId: options.placeId ?? null,
    placeName: options.placeName ?? null,
    replyToPostId: options.replyToPostId ?? null,
    quoteOfPostId: options.quoteOfPostId ?? null,
    repostOfPostId: options.repostOfPostId ?? null,
    composerMeta: POST_COMPOSER_META,
  };
}

export function toPostComposeInput(compose: PostComposeInput): PostComposeInput {
  return {
    bodyText: compose.bodyText,
    mediaItems: compose.mediaItems.map((item) => ({ ...item })),
    entityRanges: compose.entityRanges.map((item) => ({ ...item })),
    linkUrl: compose.linkUrl,
    linkCardDisabled: compose.linkCardDisabled,
    visibility: compose.visibility,
    likePermission: compose.likePermission,
    bookmarkPermission: compose.bookmarkPermission,
    commentPermission: compose.commentPermission,
    quotePermission: compose.quotePermission,
    repostPermission: compose.repostPermission,
    communityId: compose.communityId,
    placeId: compose.placeId,
    placeName: compose.placeName,
    replyToPostId: compose.replyToPostId,
    quoteOfPostId: compose.quoteOfPostId,
    repostOfPostId: compose.repostOfPostId,
    composerMeta: { ...compose.composerMeta },
  };
}

export function hasPostComposeContent(compose: PostComposeInput): boolean {
  return Boolean(compose.bodyText || compose.mediaItems.length || compose.linkUrl);
}

export function fingerprintPostCompose(compose: PostComposeInput): string {
  return JSON.stringify(toPostComposeInput(compose));
}
