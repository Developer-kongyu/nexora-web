import { buildPostComposeEntityRanges, buildPostHttpUrlRanges } from './compose';

export type PostTextSegment =
  | { kind: 'TEXT'; text: string }
  | { kind: 'HASHTAG'; text: string; tag: string }
  | { kind: 'MENTION'; text: string; handle: string }
  | { kind: 'LINK'; text: string; url: string };

export function buildPostTextSegments(bodyText: string): PostTextSegment[] {
  const ranges = [
    ...buildPostComposeEntityRanges(bodyText),
    ...buildPostHttpUrlRanges(bodyText),
  ].sort((left, right) => left.startOffset - right.startOffset || right.endOffset - left.endOffset);
  const segments: PostTextSegment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.startOffset < cursor) continue;
    if (range.startOffset > cursor) {
      segments.push({ kind: 'TEXT', text: bodyText.slice(cursor, range.startOffset) });
    }

    const text = bodyText.slice(range.startOffset, range.endOffset);
    if (range.entityType === 'HASHTAG') {
      segments.push({ kind: 'HASHTAG', text, tag: range.tagTextSnapshot });
    } else if (range.entityType === 'MENTION') {
      segments.push({ kind: 'MENTION', text, handle: range.handleSnapshot });
    } else {
      segments.push({ kind: 'LINK', text, url: range.url });
    }
    cursor = range.endOffset;
  }

  if (cursor < bodyText.length) {
    segments.push({ kind: 'TEXT', text: bodyText.slice(cursor) });
  }

  return segments;
}
