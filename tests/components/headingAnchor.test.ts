import { describe, expect, it } from 'vitest';

import { extractBlockAnchor } from '@/components/common/milkdown/plugins/headingAnchor';

describe('heading anchor plugin', () => {
  it('removes block anchors and escaped spaces from parsed text', () => {
    const paragraph = {
      type: 'paragraph',
      children: [
        { type: 'text', value: 'First paragraph \\ ' },
        { type: 'html', value: '<!-- dmh:block=note-block-abc123 -->' },
      ],
    };

    expect(extractBlockAnchor(paragraph)).toBe('note-block-abc123');
    expect(paragraph.children).toEqual([
      { type: 'text', value: 'First paragraph' },
    ]);
  });
});
