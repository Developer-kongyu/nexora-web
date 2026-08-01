export const ACCENT_TONES = ['purple', 'cyan', 'green', 'pink', 'orange'] as const;

export type AccentTone = (typeof ACCENT_TONES)[number];
