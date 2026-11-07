import { describe, expect, it } from 'vitest';
import {
  ensureBlockAnchors,
  extractBlockAnchorId,
  stripBlockAnchors,
} from '@/utils/noteAnchors';

describe('note block anchors', () => {
  it('adds anchors to top-level headings and paragraphs only', () => {
    const markdown = [
      '# Heading',
      '',
      'First paragraph.',
      '',
      '- list item',
      '',
      'Second paragraph.',
    ].join('\n');

    const anchored = ensureBlockAnchors(markdown);

    expect(anchored.match(/dmh:block=/g)).toHaveLength(3);
    expect(anchored).toMatch(/^# Heading <!-- dmh:block=note-block-/);
    expect(anchored).toMatch(/First paragraph\. <!-- dmh:block=note-block-/);
    expect(anchored).toContain('- list item\n');
    expect(anchored).not.toContain('- list item <!-- dmh:block=');
  });

  it('is idempotent and keeps the original anchor when text changes', () => {
    const first = ensureBlockAnchors('# Heading\n\nParagraph.');
    const anchor = extractBlockAnchorId(first.split('\n')[0]);
    expect(anchor).toMatch(/^note-block-/);

    const second = ensureBlockAnchors(first);
    expect(second).toBe(first);

    const edited = ensureBlockAnchors(
      first.replace('Paragraph.', 'Paragraph edited.'),
    );
    const editedAnchor = extractBlockAnchorId(edited.split('\n')[2]);
    expect(editedAnchor).toBe(extractBlockAnchorId(first.split('\n')[2]));
  });

  it('strips anchors for markdown downloads', () => {
    const anchored = ensureBlockAnchors('# Heading\n\nParagraph.');
    expect(stripBlockAnchors(anchored)).toBe('# Heading\n\nParagraph.');
  });
});
