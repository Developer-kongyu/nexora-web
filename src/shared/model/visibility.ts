export const PUBLIC_PRIVATE_VISIBILITIES = ['public', 'private'] as const;
export type PublicPrivateVisibility = (typeof PUBLIC_PRIVATE_VISIBILITIES)[number];
