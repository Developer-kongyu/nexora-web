import { Image, Link2, Smile, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/domains/auth';
import { getCurrentUserPresentation } from '@/domains/users';
import { paths } from '@/shared/config/paths';
import { Avatar } from '@/shared/ui';
import styles from './QuickCompose.module.css';
export function QuickCompose() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentUser = getCurrentUserPresentation(user);
  const openCompose = () => navigate(paths.compose);

  return (
    <section className={styles.quickCompose}>
      <Avatar fallback={currentUser.avatarFallback} alt={currentUser.displayName} />
      <button type="button" className={styles.prompt} onClick={openCompose}>
        分享此刻的想法、发现或作品…
      </button>
      <div className={styles.quickTools}>
        <button type="button" title="图片" aria-label="添加图片" onClick={openCompose}>
          <Image size={18} />
        </button>
        <button type="button" title="链接" aria-label="添加链接" onClick={openCompose}>
          <Link2 size={18} />
        </button>
        <button type="button" title="表情" aria-label="添加表情" onClick={openCompose}>
          <Smile size={18} />
        </button>
        <button type="button" title="灵感" aria-label="打开灵感" onClick={openCompose}>
          <Sparkles size={18} />
        </button>
      </div>
    </section>
  );
}
