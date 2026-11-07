import { describe, expect, it } from 'vitest';
import { collectTocItems } from '@/components/common/milkdown/plugins/toc';

function fakeDoc(nodes: any[]) {
  return {
    forEach: (visit: (node: any, offset: number) => void) => {
      let offset = 0;
      for (const node of nodes) {
        visit(node, offset);
        offset += node.nodeSize;
      }
    },
  };
}

describe('TOC block collection', () => {
  it('uses persistent block anchors for headings and paragraphs', () => {
    const doc = fakeDoc([
      {
        type: { name: 'heading' },
        textContent: 'Heading',
        attrs: {
          id: 'note-block-heading',
          blockAnchor: 'note-block-heading',
          level: 1,
        },
        nodeSize: 10,
      },
      {
        type: { name: 'paragraph' },
        textContent: 'Paragraph text',
        attrs: { blockAnchor: 'note-block-paragraph' },
        nodeSize: 5,
      },
    ]);

    expect(collectTocItems(doc)).toEqual([
      {
        id: 'note-block-heading',
        anchorId: 'note-block-heading',
        level: 1,
        title: 'Heading',
        kind: 'heading',
      },
      {
        id: 'note-block-paragraph',
        anchorId: 'note-block-paragraph',
        level: 0,
        title: 'Paragraph text',
        kind: 'paragraph',
      },
    ]);
  });

  it('falls back for legacy blocks without anchors', () => {
    const doc = fakeDoc([
      {
        type: { name: 'heading' },
        textContent: 'Heading',
        attrs: { id: 'heading', level: 2 },
        nodeSize: 10,
      },
      {
        type: { name: 'paragraph' },
        textContent: 'Paragraph text',
        attrs: {},
        nodeSize: 5,
      },
    ]);

    const items = collectTocItems(doc);
    expect(items[0].anchorId).toBe('heading');
    expect(items[1].anchorId).toMatch(/^note-p-/);
  });
});
