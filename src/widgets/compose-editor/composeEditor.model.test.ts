import { describe, expect, it } from 'vitest';
import type { PostDraftDetailView } from '@/domains/posts/model';
import {
  DEFAULT_COMPOSE_EDITOR_VALUES,
  draftComposeToEditorValues,
  getDraftMediaAssetIds,
  optionalGeneralPermission,
  optionalSourcePermission,
  optionalVisibility,
} from './composeEditor.model';

function draftDetail(): PostDraftDetailView {
  return {
    draftId: 'draft-1',
    draftVersion: 4,
    state: 'EDITABLE',
    composeSnapshot: {
      bodyText: '  草稿正文  ',
      bodyTextNormalized: '草稿正文',
      mediaItems: [
        { mediaAssetId: 'media-b', title: null, description: null, sortOrder: 2 },
        { mediaAssetId: 'media-a', title: null, description: null, sortOrder: 1 },
      ],
      entityRanges: [],
      linkUrl: null,
      linkCardDisabled: false,
      visibility: 'FOLLOWERS',
      likePermission: 'EVERYONE',
      bookmarkPermission: 'EVERYONE',
      commentPermission: 'FOLLOWING',
      quotePermission: 'NO_ONE',
      repostPermission: 'FOLLOWING',
      communityId: 'community-1',
      placeId: null,
      placeName: null,
      replyToPostId: null,
      quoteOfPostId: 'post-quoted',
      repostOfPostId: null,
      composerMeta: {
        editorKind: 'TEXTAREA',
        textIndexUnit: 'UTF16_CODE_UNIT',
        normalizationVersion: 'POST_TEXT_NORMALIZATION_V1',
      },
    },
    validationDiagnostics: null,
    linkPreviewState: { state: 'NONE', card: null },
    updatedAtIso: '2026-07-28T00:00:00.000Z',
    lastAutosavedAtIso: null,
    lastSavedAtIso: '2026-07-28T00:00:00.000Z',
  };
}

describe('compose editor model', () => {
  it('maps a draft snapshot into editable form values without losing permissions', () => {
    expect(draftComposeToEditorValues(draftDetail().composeSnapshot)).toEqual({
      content: '  草稿正文  ',
      communityId: 'community-1',
      visibility: 'FOLLOWERS',
      commentPermission: 'FOLLOWING',
      quotePermission: 'NO_ONE',
      repostPermission: 'FOLLOWING',
    });
  });

  it('orders persisted media by the canonical sort order', () => {
    expect(getDraftMediaAssetIds(draftDetail().composeSnapshot)).toEqual(['media-a', 'media-b']);
  });

  it('normalizes optional select values and supplies stable defaults', () => {
    expect(optionalVisibility('')).toBeNull();
    expect(optionalVisibility('PUBLIC')).toBe('PUBLIC');
    expect(optionalGeneralPermission('')).toBeNull();
    expect(optionalGeneralPermission('MUTUALS')).toBe('MUTUALS');
    expect(optionalSourcePermission('')).toBeNull();
    expect(optionalSourcePermission('FOLLOWING')).toBe('FOLLOWING');
    expect(DEFAULT_COMPOSE_EDITOR_VALUES).toEqual({
      content: '',
      communityId: '',
      visibility: '',
      commentPermission: '',
      quotePermission: '',
      repostPermission: '',
    });
  });
});
