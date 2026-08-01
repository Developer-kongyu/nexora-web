import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePost } from '@/domains/posts';
import { paths } from '@/shared/config/paths';
import { Spinner } from '@/shared/ui';
import { MediaViewer } from '@/widgets/media-viewer/MediaViewer';

export function MediaViewerPage() {
  const { postId = '', mediaIndex = '0' } = useParams();
  const navigate = useNavigate();
  const post = usePost(postId);

  if (post.isLoading) return <Spinner label="正在加载媒体" />;
  if (!post.data || !post.data.media.length) {
    return <Navigate to={paths.post(postId)} replace />;
  }

  const parsedIndex = Number.parseInt(mediaIndex, 10);
  const safeIndex = Number.isFinite(parsedIndex)
    ? Math.min(Math.max(parsedIndex, 0), post.data.media.length - 1)
    : 0;

  return <MediaViewer post={post.data} initialIndex={safeIndex} onClose={() => navigate(-1)} />;
}
