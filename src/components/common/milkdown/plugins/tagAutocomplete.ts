import { $prose } from '@milkdown/utils';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';

export interface TagAutocompletePayload {
  query: string;
  from: number;
  to: number;
  position: { top: number; left: number };
  insert: (tag: string) => void;
}

type TagAutocompleteTrigger = (payload: TagAutocompletePayload | null) => void;

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
