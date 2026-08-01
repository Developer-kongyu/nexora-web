import { Bell, MessageCircle, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { useUnreadSummary } from '@/domains/notifications';
import { getCurrentUserPresentation } from '@/domains/users';
import { paths } from '@/shared/config/paths';
import { useSynchronizedState } from '@/shared/hooks/useSynchronizedState';
import { Avatar, IconButton, useToast } from '@/shared/ui';
import styles from './Topbar.module.css';

export function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const urlQuery = location.pathname === '/search' ? (params.get('q') ?? '') : '';
  const [query, setQuery] = useSynchronizedState(urlQuery, urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((state) => state.user);
  const currentUser = getCurrentUserPresentation(user);
  const unread = useUnreadSummary();
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    const ownerWindow = inputRef.current?.ownerDocument.defaultView ?? window;
    ownerWindow.addEventListener('keydown', handler);
    return () => ownerWindow.removeEventListener('keydown', handler);
  }, []);

  const submit = () => {
    const value = query.trim();
    if (value) navigate(paths.searchResults(value));
    else inputRef.current?.focus();
  };

  return (
    <header className={styles.topbar}>
      <form
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Search size={19} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索帖子、用户或社群"
          aria-label="全站搜索"
        />
        <kbd>⌘ K</kbd>
        {query ? <button type="submit">搜索</button> : null}
      </form>
      <div className={styles.actions}>
        <IconButton
          label="消息"
          icon={<MessageCircle size={19} />}
          onClick={() =>
            showToast({
              tone: 'info',
              title: '暂无未读消息',
              description: '新的私信会在这里提醒你。',
            })
          }
        />
        <span className={styles.notification}>
          <IconButton
            label="通知"
            icon={<Bell size={19} />}
            onClick={() => navigate(paths.notifications)}
          />
          {(unread.data?.totalUnreadCount ?? 0) > 0 ? <i /> : null}
        </span>
        <button
          type="button"
          className={styles.profile}
          onClick={() => navigate(currentUser.profilePath)}
        >
          <Avatar
            fallback={currentUser.avatarFallback}
            alt={currentUser.displayName}
            src={user?.avatarUrl}
            size="sm"
          />
          <span>
            <strong>{currentUser.displayName}</strong>
            <small>在线</small>
          </span>
        </button>
      </div>
    </header>
  );
}
