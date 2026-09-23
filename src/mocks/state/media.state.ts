import type { MediaAssetScene, UploadableMediaKind, MediaAssetStatus } from '@/domains/media/model';

export interface MockMediaAsset {
  mediaAssetId: string;
  clientUploadId: string;
  scene: MediaAssetScene;
  assetKind: UploadableMediaKind;
  fileName: string;
  contentType: string;
  sizeInBytes: string;
  objectKey: string;
  uploadSessionRevision: string;
  status: MediaAssetStatus;
  confirmCount: number;
}

function createMediaState() {
  const mockMediaAssetsById = new Map<string, MockMediaAsset>();

  const mockMediaAssetsByBusinessKey = new Map<string, MockMediaAsset>();

  function mediaBusinessKey(scene: MediaAssetScene, clientUploadId: string): string {
    return `${scene}:${clientUploadId}`;
  }

  function mockUploadTicket(asset: MockMediaAsset) {
    const expiresInSeconds = 900;
    return {
      token: `mock-upload-token-${asset.mediaAssetId}`,
      objectKey: asset.objectKey,
      bucket: 'mock-public-media',
      uploadSessionRevision: asset.uploadSessionRevision,
      region: 'z0',
      expiresInSeconds,
      expiresAtIso: new Date(Date.now() + expiresInSeconds * 1_000).toISOString(),
      sdkScriptUrl: '/mock-qiniu-sdk.js',
      recommendedClientConfig: {
        useCdnDomain: true,
        checkByMD5: false,
        forceDirect: false,
        chunkSizeMB: 4,
      },
    };
  }

  function findReadyMockMedia(storageKey: string, scene: MediaAssetScene): MockMediaAsset | null {
    for (const asset of mockMediaAssetsById.values()) {
      if (asset.objectKey === storageKey && asset.scene === scene && asset.status === 'READY') {
        return asset;
      }
    }
    return null;
  }
  return {
    mockMediaAssetsById,
    mockMediaAssetsByBusinessKey,
    mediaBusinessKey,
    mockUploadTicket,
    findReadyMockMedia,
  };
}

export let mediaState = createMediaState();

export function resetMediaState(): void {
  mediaState = createMediaState();
}
