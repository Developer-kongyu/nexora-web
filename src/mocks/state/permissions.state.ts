function createPermissionsState() {
  const baseMockPermissionPolicy = {
    accountVisibility: 'PUBLIC' as const,
    allowSearchIndex: true,
    defaultPostVisibility: 'PUBLIC' as const,
    defaultLikePermission: 'EVERYONE' as const,
    defaultBookmarkPermission: 'EVERYONE' as const,
    defaultCommentPermission: 'EVERYONE' as const,
    defaultQuotePermission: 'EVERYONE' as const,
    defaultRepostPermission: 'EVERYONE' as const,
    mentionPermission: 'EVERYONE' as const,
    followerListVisibility: 'EVERYONE' as const,
    followingListVisibility: 'EVERYONE' as const,
    birthdayVisibility: 'HIDDEN' as const,
  };

  let mockPermissionPolicy = { ...baseMockPermissionPolicy };
  return {
    baseMockPermissionPolicy,
    get mockPermissionPolicy() {
      return mockPermissionPolicy;
    },
    set mockPermissionPolicy(value: typeof mockPermissionPolicy) {
      mockPermissionPolicy = value;
    },
  };
}

export let permissionsState = createPermissionsState();

export function resetPermissionsState(): void {
  permissionsState = createPermissionsState();
}
