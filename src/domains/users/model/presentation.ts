import { paths } from '@/shared/config/paths';
import type { UserSummary } from './types';

export interface CurrentUserPresentation {
  displayName: string;
  handle: string | null;
  avatarFallback: string;
  profilePath: string;
}

export function getCurrentUserPresentation(
  user: Pick<UserSummary, 'displayName' | 'handle'> | null | undefined,
): CurrentUserPresentation {
  const displayName = user?.displayName.trim() || '当前用户';
  const handle = user?.handle.trim() || null;

  return {
    displayName,
    handle,
    avatarFallback: displayName.slice(0, 1) || '我',
    profilePath: handle ? paths.profile(handle) : paths.settingsProfile,
  };
}
