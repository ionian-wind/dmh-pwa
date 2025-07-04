import { $markSchema } from '@milkdown/utils';
import { $command } from '@milkdown/kit/utils';

import { debug } from '@/utils/debug';

// Regex for internal entity links
const entityLinkRegex =
  /^(note|module|party|monster|encounter):\/\/([a-zA-Z0-9_-]+)$/;

// 1. Define the mention mark schema
export const mentionMark = $markSchema('mention', () => ({
  attrs: {
    kind: { default: null },
    id: { default: null },
    href: { default: null },
    title: { default: null },
  },
  parseDOM: [
    {
      tag: 'a[data-kind][data-id]',
      getAttrs: (dom: HTMLElement) => ({
        kind: dom.getAttribute('data-kind'),
        id: dom.getAttribute('data-id'),
        href: dom.getAttribute('href'),
        title: dom.getAttribute('title'),
      }),
    },
  ],
  toDOM: (mark) => {
    const { kind, id, href, title } = mark.attrs;
    return [
      'a',
      {
        href: href || `/${kind}s/${id}`,
        'data-kind': kind,
        'data-id': id,
        class: `internal-link ${kind}-link`,
        title,
      },
      0,
    ];
  },
  parseMarkdown: {
    match: (node) =>
      node.type === 'link' && entityLinkRegex.test(node.url as string),
    runner: (state, node, markType) => {
      const match = entityLinkRegex.exec(node.url as string);
      if (!match) return;
      const kind = match[1];
      const id = match[2];
      state.openMark(markType, {
        kind,
        id,
        href: node.url,
        title: node.title,
      });
      state.next(node.children);
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => (mark as any).type.name === 'mention',
    runner: (state, m) => {
      const mark = m as any;
      const attrs = mark.attrs as any;
      const kind: string = String(attrs.kind ?? '');
      const id: string = String(attrs.id ?? '');
      // Only include title if it is non-empty and not redundant
      // For mentions, do not include title or id in the markdown output, and ensure the path is just kind://
      // @ts-ignore: dynamic mark/attrs typing is required for plugin
      state.withMark(mark, 'link', undefined, {
        url: `${kind}://${id}`,
      });
    },
  },
}));

debug('insertMentionCommand factory evaluated');
// @ts-ignore: dynamic typing for custom command is required
export const insertMentionCommand = $command(
  'InsertMention',
  (_ctx: any) => (content: unknown) => (state: any, dispatch: any) => {
    debug('[MilkdownMentionPlugin] insertMentionCommand called with:', content);
    const { selection } = state;
    if (!selection) return false;
    const tr = state.tr.insertText(
      typeof content === 'string' ? content : '',
      selection.from,
    );
    dispatch?.(tr);
    return true;
  },
);

// Placeholder for popup trigger logic
let showMentionPopup:
  | null
  | ((opts: {
      kind: string;
      mentions: any[];
      position: { top: number; left: number };
      onSelect: (mention: any) => void;
    }) => void) = null;

export function registerMentionPopupTrigger(fn: typeof showMentionPopup) {
  showMentionPopup = fn;
}

// Helper to calculate popup position (to be implemented using Crepe/ProseMirror logic)
function getMentionPopupPosition(editorView: any) {
  let coords: { top: number; left: number; bottom?: number } = { top: 100, left: 100 };

  if (!editorView || !editorView.state || !editorView.dom) {
    return coords;
  }
  
  const { selection } = editorView.state;
  
  try {
    // Use the end of the selection for popup position
    coords = editorView.coordsAtPos(selection.to) as { top: number; left: number; bottom: number };
    // Optionally, offset the popup a bit below the cursor
    coords = { top: (coords.bottom ?? coords.top) + 4, left: coords.left };
  } catch (e) {
    // fallback
  }
  return coords;
}

// Helper to insert a mention mark at the current selection
function insertMentionMark(
  ctx: any,
  kind: string,
  label: string,
  source: string,
) {
  // Always show popup if available
  if (showMentionPopup) {
    const editorView = ctx.get('editorView') || ctx.get('view');
    // The mentions list and position will be provided by the popup trigger registration
    // (see MilkdownEditor.vue)
    const position = getMentionPopupPosition(editorView);
    showMentionPopup({
      kind,
      mentions: [], // Will be replaced by the popup trigger registration
      position,
      onSelect: (mention) => {
        try {
          if (editorView && editorView.state) {
            const { state, dispatch } = editorView;
            const { selection, schema } = state;
            if (selection) {
              const selectedText =
                state.doc.textBetween(
                  selection.from,
                  selection.to,
                  '\u200b',
                  '\u200b',
                ) ||
                mention.title ||
                mention.name;
              const mentionMarkType = schema.marks.mention;
              if (!mentionMarkType) return false;
              let tr = state.tr.delete(selection.from, selection.to);
              tr = tr.insertText(selectedText, selection.from);
              tr = tr.addMark(
                selection.from,
                selection.from + selectedText.length,
                mentionMarkType.create({
                  kind,
                  id: mention.id,
                  href: `${kind}://`,
                  title: selectedText,
                }),
              );
              dispatch(tr);
              return true;
            }
          }
        } catch (error) {
          debug(`[${source}] Error inserting mention mark:`, error);
        }
        return false;
      },
    });
    return true;
  }
  // fallback: old behavior
  debug(`[${source}] mention menu item clicked`, { ctx, kind, label });
  try {
    // @ts-ignore: Access editor view from context
    const editorView = ctx.get('editorView') || ctx.get('view');
    if (editorView && editorView.state) {
      const { state, dispatch } = editorView;
      const { selection, schema } = state;
      if (selection) {
        const selectedText =
          state.doc.textBetween(
            selection.from,
            selection.to,
            '\u200b',
            '\u200b',
          ) || label;
        const mentionMarkType = schema.marks.mention;
        if (!mentionMarkType) return false;
        // Remove current selection and insert new text with mention mark
        let tr = state.tr.delete(selection.from, selection.to);
        tr = tr.insertText(selectedText, selection.from);
        tr = tr.addMark(
          selection.from,
          selection.from + selectedText.length,
          mentionMarkType.create({
            kind,
            id: '', // No id yet
            href: `${kind}://`,
            title: selectedText,
          }),
        );
        dispatch(tr);
        return true;
      }
    }
  } catch (error) {
    debug(`[${source}] Error inserting mention mark:`, error);
  }
  return false;
}

// 2. Register the mark in a Crepe feature
export const mentionFeature = (ctx: any) => {
  ctx.use(mentionMark);
  console.log(ctx);
};

const iconNote = `
<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-note"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M13 20l7 -7" /><path d="M13 20v-6a1 1 0 0 1 1 -1h6v-7a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7" /></svg>`;
const iconBook = `
<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-book"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6l0 13" /><path d="M12 6l0 13" /><path d="M21 6l0 13" /></svg>`;
const iconUsers = `
<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-users"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></svg>`;
const iconGhost = `
<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-ghost-3"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 11a7 7 0 0 1 14 0v7a1.78 1.78 0 0 1 -3.1 1.4a1.65 1.65 0 0 0 -2.6 0a1.65 1.65 0 0 1 -2.6 0a1.65 1.65 0 0 0 -2.6 0a1.78 1.78 0 0 1 -3.1 -1.4v-7" /><path d="M10 10h.01" /><path d="M14 10h.01" /></svg>`;
const iconSwords = `
<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-swords"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M21 3v5l-11 9l-4 4l-3 -3l4 -4l9 -11z" /><path d="M5 13l6 6" /><path d="M14.32 17.32l3.68 3.68l3 -3l-3.365 -3.365" /><path d="M10 5.5l-2 -2.5h-5v5l3 2.5" /></svg>`;

const mentionKinds = [
  { kind: 'note', label: 'Note', icon: iconNote },
  { kind: 'module', label: 'Module', icon: iconBook },
  { kind: 'party', label: 'Party', icon: iconUsers },
  { kind: 'monster', label: 'Monster', icon: iconGhost },
  { kind: 'encounter', label: 'Encounter', icon: iconSwords },
];

// Restore buildMentionToolbar for use with buildToolbar callback in Crepe toolbar config
export const buildMentionToolbar = (groupBuilder: any) => {
  const mentionGroup = groupBuilder.addGroup('mentions', 'Mentions');
  mentionKinds.forEach(({ kind, label, icon }) => {
    mentionGroup.addItem(kind, {
      icon,
      active: () => false,
      onRun: (ctx: any) => insertMentionMark(ctx, kind, label, 'Toolbar'),
    });
  });
};

// Build mentions menu for BlockEdit feature
export const buildMentionMenu = (builder: any) => {
  const mentionGroup = builder.addGroup('mentions', 'Mentions');
  mentionKinds.forEach(({ kind, label, icon }) => {
    mentionGroup.addItem(kind, {
      label,
      icon,
      onRun: (ctx: any) => insertMentionMark(ctx, kind, label, 'BlockEdit'),
    });
  });
};
