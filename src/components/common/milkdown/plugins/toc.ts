import { $prose } from '@milkdown/utils';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import bookmarkIcon from '@tabler/icons/outline/bookmark.svg?raw';
import bookmarkFilledIcon from '@tabler/icons/filled/bookmark.svg?raw';

export interface TocItem {
  id: string;
  anchorId: string;
  level: number;
  title: string;
  kind: 'heading' | 'paragraph';
}

interface TocBlock {
  node: any;
  pos: number;
  anchorId: string;
  level: number;
  title: string;
  kind: 'heading' | 'paragraph';
}

const PARAGRAPH_TITLE_LIMIT = 100;

function paragraphTitle(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= PARAGRAPH_TITLE_LIMIT) return normalized;
  return `${normalized.slice(0, PARAGRAPH_TITLE_LIMIT - 1).trimEnd()}…`;
}

/**
 * Content-based paragraph anchor. Unlike a document index this survives
 * insertions/deletions elsewhere in the note; editing the paragraph itself
 * changes the anchor and intentionally makes the bookmark stale.
 */
function paragraphAnchorBase(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  let hash = 5381;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(index);
  }
  return `note-p-${(hash >>> 0).toString(36)}`;
}

function walkTocBlocks(doc: any, visit: (block: TocBlock) => void) {
  let headingIndex = 0;
  const paragraphOccurrences = new Map<string, number>();

  doc.forEach((node: any, offset: number) => {
    if (node.type.name === 'heading') {
      headingIndex += 1;
      const title = node.textContent.trim();
      if (!title) return;
      const anchorId =
        node.attrs.blockAnchor ||
        node.attrs.id ||
        `note-heading-${headingIndex}`;
      visit({
        node,
        pos: offset,
        anchorId,
        level: node.attrs.level ?? 1,
        title,
        kind: 'heading',
      });
      return;
    }

    if (node.type.name === 'paragraph') {
      const title = paragraphTitle(node.textContent);
      if (!title) return;
      const base =
        node.attrs.blockAnchor || paragraphAnchorBase(node.textContent);
      const occurrence = (paragraphOccurrences.get(base) ?? 0) + 1;
      paragraphOccurrences.set(base, occurrence);
      visit({
        node,
        pos: offset,
        anchorId: occurrence === 1 ? base : `${base}-${occurrence}`,
        level: 0,
        title,
        kind: 'paragraph',
      });
    }
  });
}

export function collectTocItems(doc: any): TocItem[] {
  const items: TocItem[] = [];
  walkTocBlocks(doc, (block) => {
    items.push({
      id: block.anchorId,
      anchorId: block.anchorId,
      level: block.level,
      title: block.title,
      kind: block.kind,
    });
  });
  return items;
}

function createBookmarkWidget(block: TocBlock) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'toc-bookmark-widget';
  button.dataset.anchorId = block.anchorId;
  button.dataset.title = block.title;
  button.setAttribute('contenteditable', 'false');
  button.setAttribute('aria-label', 'Bookmark');
  button.innerHTML = `<span class="toc-bookmark-icon-outline">${bookmarkIcon}</span><span class="toc-bookmark-icon-filled">${bookmarkFilledIcon}</span>`;
  return button;
}

function buildTocDecorations(doc: any) {
  const decorations: Decoration[] = [];
  walkTocBlocks(doc, (block) => {
    decorations.push(
      Decoration.node(block.pos, block.pos + block.node.nodeSize, {
        id: block.anchorId,
        'data-toc-id': block.anchorId,
        'data-toc-kind': block.kind,
        class: 'toc-anchor-block',
      }),
      Decoration.widget(block.pos + 1, () => createBookmarkWidget(block), {
        side: -1,
        key: `toc-bookmark-${block.anchorId}`,
      }),
    );
  });
  return DecorationSet.create(doc, decorations);
}

export const tocAnchorPlugin = $prose(
  () =>
    new Plugin({
      key: new PluginKey('toc-anchors'),
      props: {
        decorations: (state) => buildTocDecorations(state.doc),
      },
    }),
);

export const tocFeature = (ctx: any) => {
  ctx.use(tocAnchorPlugin);
};
