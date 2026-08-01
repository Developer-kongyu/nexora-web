export const libraryKeys = {
  bookmarks: ['bookmarks'] as const,
  bookmarkCollections: ['bookmarks', 'collections'] as const,
  bookmarkCollectionItems: (collectionId: string | null) =>
    ['bookmarks', 'collection-items', collectionId] as const,
  contentCenter: ['content-center'] as const,
  contentCenterPublished: ['content-center', 'published'] as const,
  contentCenterDrafts: ['content-center', 'drafts'] as const,
  contentCenterDeleted: ['content-center', 'deleted'] as const,
  history: ['history'] as const,
};
