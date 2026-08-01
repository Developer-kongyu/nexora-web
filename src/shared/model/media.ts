export const RESOLVED_MEDIA_STATES = ['READY', 'PROCESSING', 'FAILED', 'MISSING'] as const;

export type ResolvedMediaState = (typeof RESOLVED_MEDIA_STATES)[number];
