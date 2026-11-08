import { $prose } from '@milkdown/utils';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';

const TAG_PATTERN = /(?:^|[\s(["'>])#([\p{L}\p{N}_-]+)/gu;

export function findTagRanges(
  text: string,
): Array<{ tag: string; start: number; end: number }> {
  const ranges: Array<{ tag: string; start: number; end: number }> = [];
  for (const match of text.matchAll(TAG_PATTERN)) {
    const full = match[0];
    const hashOffset = full.lastIndexOf('#');
    const start = (match.index ?? 0) + hashOffset;
    ranges.push({
      tag: match[1],
      start,
      end: start + full.length - hashOffset,
    });
  }
  return ranges;
}

export function tagDecorations(doc: any) {
  const decorations: Decoration[] = [];
  doc.descendants((node: any, pos: number, parent: any) => {
    if (!node.isText || !node.text) return;
    if (
      parent?.type?.name === 'heading' ||
      parent?.type?.name === 'code_block'
    ) {
      return;
    }
    if (node.marks?.some((mark: any) => mark.type.name === 'code')) return;

    for (const range of findTagRanges(node.text)) {
      decorations.push(
        Decoration.inline(pos + range.start, pos + range.end, {
          class: 'tag-link',
          'data-tag': range.tag,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const tagDecorationPlugin = $prose(
  () =>
    new Plugin({
      key: new PluginKey('tag-decoration'),
      props: {
        decorations: (state) => tagDecorations(state.doc),
      },
    }),
);

export const tagDecorationFeature = (ctx: any) => {
  ctx.use(tagDecorationPlugin);
};
