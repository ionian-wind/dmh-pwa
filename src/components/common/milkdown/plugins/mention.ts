import { $markSchema } from '@milkdown/utils';
import { $command } from '@milkdown/kit/utils';

import { debug } from '@/utils/debug';
import iconNote from '@tabler/icons/outline/note.svg?raw';
import iconBook from '@tabler/icons/outline/book.svg?raw';
import iconUsers from '@tabler/icons/outline/users.svg?raw';
import iconGhost from '@tabler/icons/outline/ghost-3.svg?raw';
import iconSwords from '@tabler/icons/outline/swords.svg?raw';
import iconMap from '@tabler/icons/outline/map.svg?raw';

// Regex for internal entity links
const entityLinkRegex =
  /^(note|module|party|monster|encounter|map):\/\/([a-zA-Z0-9_-]+)$/;

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
  let coords: { top: number; left: number; bottom?: number } = {
    top: 100,
    left: 100,
  };

  if (!editorView || !editorView.state || !editorView.dom) {
    return coords;
  }

  const { selection } = editorView.state;

  try {
    // Use the end of the selection for popup position
    coords = editorView.coordsAtPos(selection.to) as {
      top: number;
      left: number;
      bottom: number;
    };
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
};

function mentionIcon(svg: string) {
  return svg.replace('class="', 'class="mention-tabler-icon ');
}

const mentionKinds = [
  { kind: 'note', label: 'notes.title', icon: mentionIcon(iconNote) },
  { kind: 'module', label: 'modules.title', icon: mentionIcon(iconBook) },
  { kind: 'party', label: 'parties.title', icon: mentionIcon(iconUsers) },
  { kind: 'monster', label: 'monsters.title', icon: mentionIcon(iconGhost) },
  {
    kind: 'encounter',
    label: 'encounters.title',
    icon: mentionIcon(iconSwords),
  },
  { kind: 'location', label: 'maps.locations', icon: mentionIcon(iconMap) },
];

type Translate = (key: string) => string;
const identity: Translate = (key) => key;

// Restore buildMentionToolbar for use with buildToolbar callback in Crepe toolbar config
export const buildMentionToolbar = (
  groupBuilder: any,
  translate: Translate = identity,
) => {
  const mentionGroup = groupBuilder.addGroup(
    'mentions',
    translate('common.mentions'),
  );
  mentionKinds.forEach(({ kind, label, icon }) => {
    mentionGroup.addItem(kind, {
      icon,
      label: translate(label),
      active: () => false,
      onRun: (ctx: any) => insertMentionMark(ctx, kind, label, 'Toolbar'),
    });
  });
};

// Build mentions menu for BlockEdit feature
export const buildMentionMenu = (
  builder: any,
  translate: Translate = identity,
) => {
  const mentionGroup = builder.addGroup(
    'mentions',
    translate('common.mentions'),
  );
  mentionKinds.forEach(({ kind, label, icon }) => {
    mentionGroup.addItem(kind, {
      label: translate(label),
      icon,
      onRun: (ctx: any) => insertMentionMark(ctx, kind, label, 'BlockEdit'),
    });
  });
};
