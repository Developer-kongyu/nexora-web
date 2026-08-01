import { create } from 'zustand';
import { validatePostMediaFile } from '../lib/postMedia';
import { MEDIA_POST_MAX_FILES } from './constraints';
import type { UploadItem } from './types';

interface UploadQueueState {
  items: UploadItem[];
  addFiles: (files: File[]) => UploadItem[];
  remove: (id: string) => void;
  update: (id: string, patch: Partial<UploadItem>) => void;
  clear: () => void;
}

function releasePreview(item: UploadItem): void {
  URL.revokeObjectURL(item.previewUrl);
}

export const useUploadQueueStore = create<UploadQueueState>((set, get) => ({
  items: [],
  addFiles: (files) => {
    const availableSlots = Math.max(0, MEDIA_POST_MAX_FILES - get().items.length);
    const addedItems = files.slice(0, availableSlots).flatMap((file) => {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) return [];
      return [
        {
          clientUploadId: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          assetKind: validation.assetKind,
          progress: 0,
          status: 'local' as const,
        },
      ];
    });
    if (addedItems.length) {
      set((state) => ({ items: [...state.items, ...addedItems] }));
    }
    return addedItems;
  },
  remove: (id) =>
    set((state) => {
      const target = state.items.find((item) => item.clientUploadId === id);
      if (target) releasePreview(target);
      return { items: state.items.filter((item) => item.clientUploadId !== id) };
    }),
  update: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.clientUploadId === id ? { ...item, ...patch } : item)),
    })),
  clear: () =>
    set((state) => {
      state.items.forEach(releasePreview);
      return { items: [] };
    }),
}));
