import { Link } from 'react-router-dom';
import { paths } from '@/shared/config/paths';

export interface PostTagLinksProps {
  tags: readonly string[];
  className?: string;
}

export function PostTagLinks({ tags, className }: PostTagLinksProps) {
  if (!tags.length) return null;

  return (
    <div className={className}>
      {tags.map((tag) => (
        <Link key={tag} to={paths.searchResults(tag)}>
          #{tag}
        </Link>
      ))}
    </div>
  );
}
