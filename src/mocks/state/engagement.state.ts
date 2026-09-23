function createEngagementState() {
  const mockRepostedPostIds = new Set<string>();
  return {
    mockRepostedPostIds,
  };
}

export let engagementState = createEngagementState();

export function resetEngagementState(): void {
  engagementState = createEngagementState();
}
