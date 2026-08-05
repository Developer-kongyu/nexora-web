import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { buildPostTextSegments } from '@/domains/posts';
import { paths } from '@/shared/config/paths';
import styles from './PostRichText.module.css';

export interface PostRichTextProps {
  text: string;
  className?: string;
}

export function PostRichText({ text, className }: PostRichTextProps) {
  return (
    <p className={clsx(styles.root, className)}>
      {buildPostTextSegments(text).map((segment, index) => {
        const key = [index, segment.kind, segment.text].join(':');
        if (segment.kind === 'HASHTAG') {
          return (
            <Link key={key} className={styles.entity} to={paths.searchResults(segment.tag)}>
              {segment.text}
            </Link>
          );
        }
        if (segment.kind === 'MENTION') {
          return (
            <Link key={key} className={styles.entity} to={paths.profile(segment.handle)}>
              {segment.text}
            </Link>
          );
        }
        if (segment.kind === 'LINK') {
          return (
            <a
              key={key}
              className={clsx(styles.entity, styles.external)}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {segment.text}
            </a>
          );
        }
        return segment.text;
      })}
    </p>
  );
}
