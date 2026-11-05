const HASHTAG_PATTERN = /(?:^|[\s(["'>])#([\p{L}\p{N}_-]+)/gu;

/** Extract unique hashtag names from note text. Headings (`# Title`) are ignored. */
export function extractHashtags(content: string): string[] {
  if (!content) return [];
  const tags = new Set<string>();
  for (const match of content.matchAll(HASHTAG_PATTERN)) {
    const tag = match[1]?.trim();
    if (tag) tags.add(tag);
  }
  return [...tags];
}

/** Merge hashtags found in content into an existing tag list. */
export function mergeHashtags(existing: string[], content: string): string[] {
  const result = [...existing];
  for (const tag of extractHashtags(content)) {
    if (!result.includes(tag)) result.push(tag);
  }
  return result;
}

/** Strip the hashtag marker so the tag remains as plain text. */
export function removeHashtag(content: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.replace(
    new RegExp(`(^|[\\s(["'>])#(${escaped})(?![\\p{L}\\p{N}_-])`, 'gu'),
    '$1$2',
  );
}
