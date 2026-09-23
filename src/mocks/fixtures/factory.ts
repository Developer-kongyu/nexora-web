import { currentUser, users, userProfileHeaders, incomingFollowRequests } from './users.fixture';
import { posts, contentCenterDrafts, deletedContent } from './posts.fixture';
import { communities } from './communities.fixture';
import { notifications } from './notifications.fixture';

/** Clone the complete fixture graph so related users/posts retain their shared identity. */
export function createFixtures() {
  return structuredClone({
    currentUser,
    users,
    userProfileHeaders,
    incomingFollowRequests,
    posts,
    contentCenterDrafts,
    deletedContent,
    communities,
    notifications,
  });
}
