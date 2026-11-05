import { $prose } from '@milkdown/utils';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';

export interface TagAutocompletePayload {
  query: string;
  from: number;
  to: number;
  position: { top: number; left: number };
  insert: (tag: string) => void;
}

type TagAutocompleteTrigger = (payload: TagAutocompletePayload | null) => void;

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

function tagDecorations(doc: any) {
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

export function findTagAutocomplete(
  textBefore: string,
  caret: number,
): { query: string; from: number; to: number } | null {
  const match = /(?:^|\s)#([\p{L}\p{N}_-]*)$/u.exec(textBefore);
  if (!match) return null;
  const query = match[1] ?? '';
  return {
    query,
    from: caret - query.length - 1,
    to: caret,
  };
}

let trigger: TagAutocompleteTrigger | null = null;
let editorView: any = null;
let suppress = false;

export function registerTagAutocompleteTrigger(
  fn: TagAutocompleteTrigger | null,
) {
  trigger = fn;
}

export function suppressTagAutocomplete() {
  suppress = true;
  queueMicrotask(() => {
    suppress = false;
  });
}

export const tagAutocompletePlugin = $prose(
  () =>
    new Plugin({
      key: new PluginKey('tag-autocomplete'),
      props: {
        decorations: (state) => tagDecorations(state.doc),
      },
      view(view) {
        editorView = view;
        return {
          destroy() {
            if (editorView === view) editorView = null;
          },
        };
      },
      appendTransaction(transactions, _oldState, newState) {
        if (!transactions.some((tr) => tr.docChanged) || suppress) return;

        const { selection } = newState;
        if (!selection.empty) {
          trigger?.(null);
          return;
        }

        const $from = selection.$from;
        const before = $from.parent.textBetween(
          Math.max(0, $from.parentOffset - 80),
          $from.parentOffset,
          undefined,
          '\ufffc',
        );
        const autocomplete = findTagAutocomplete(before, selection.from);
        if (!autocomplete) {
          trigger?.(null);
          return;
        }

        const { query, from, to } = autocomplete;
        let position = { top: 0, left: 0 };

        try {
          const coords = editorView?.coordsAtPos(selection.from);
          if (coords) {
            position = { top: coords.bottom + 4, left: coords.left };
          }
        } catch {
          // The editor may not be rendered yet.
        }

        trigger?.({
          query,
          from,
          to,
          position,
          insert: (tag: string) => {
            if (!editorView) return;
            const tr = editorView.state.tr.insertText(`#${tag}`, from, to);
            suppressTagAutocomplete();
            editorView.dispatch(tr);
            editorView.focus();
          },
        });
      },
    }),
);

export const tagAutocompleteFeature = (ctx: any) => {
  ctx.use(tagAutocompletePlugin);
};
