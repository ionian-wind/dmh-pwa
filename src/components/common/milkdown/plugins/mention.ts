import { $markSchema, $prose } from '@milkdown/utils';
import { $command } from '@milkdown/kit/utils';
import { editorViewCtx } from '@milkdown/kit/core';
import { Transform } from '@milkdown/kit/prose/transform';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';

import { debug } from '@/utils/debug';
import { noteDisplayTitle } from '@/utils/noteTitle';
import { clearSlashMenuText } from './slashMenu';
import { featureLinkKinds } from 'virtual:feature-links';
import iconNote from '@tabler/icons/outline/note.svg?raw';
import iconUsers from '@tabler/icons/outline/users.svg?raw';
import iconGhost from '@tabler/icons/outline/ghost-3.svg?raw';
import iconSwords from '@tabler/icons/outline/swords.svg?raw';
import iconMap from '@tabler/icons/outline/map.svg?raw';

// Match any `kind://id` link. Enabled kinds become mention links; unknown or
// disabled kinds are rendered as disabled links by the mark's toDOM.
const entityLinkRegex = /^([a-z]+):\/\/([a-zA-Z0-9_-]+)$/;
const enabledKinds = new Set(featureLinkKinds.map((option) => option.kind));

function isEnabledKind(kind: string) {
  return enabledKinds.has(kind);
}

function mentionHref(kind: string, id: string) {
  const option = featureLinkKinds.find((entry) => entry.kind === kind);
  return option ? option.route(id) : '';
}

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
    const { kind, id, title } = mark.attrs;
    if (!isEnabledKind(kind)) {
      return [
        'span',
        {
          class: 'disabled-internal-link',
          'aria-disabled': 'true',
          title,
        },
        0,
      ];
    }

    return [
      'a',
      {
        href: mentionHref(kind, id) || mark.attrs.href || '',
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
        href: null,
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
                (kind === 'note'
                  ? noteDisplayTitle(mention)
                  : mention.title || mention.name);
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
                  href: mentionHref(kind, mention.id),
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
            href: null,
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

/**
 * Normalize `kind://id` link marks into mention marks on a parsed document.
 * This is used by the static renderer, which serializes a parsed doc without
 * creating a live editor view.
 */
export function normalizeMentionDoc(doc: any, schema: any) {
  const linkType = schema?.marks?.link;
  const mentionType = schema?.marks?.mention;
  if (!linkType || !mentionType) return doc;

  const matches: Array<{
    pos: number;
    size: number;
    kind: string;
    id: string;
    title: string;
  }> = [];

  doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.marks?.length) return;
    const link = node.marks.find((mark: any) => mark.type === linkType);
    const match = link && entityLinkRegex.exec(String(link.attrs?.href ?? ''));
    if (!match) return;
    matches.push({
      pos,
      size: node.nodeSize,
      kind: match[1],
      id: match[2],
      title: link.attrs?.title || node.text,
    });
  });

  if (matches.length === 0) return doc;

  const tr = new Transform(doc);
  for (const entry of matches) {
    tr.removeMark(entry.pos, entry.pos + entry.size, linkType);
    tr.addMark(
      entry.pos,
      entry.pos + entry.size,
      mentionType.create({
        kind: entry.kind,
        id: entry.id,
        href: null,
        title: entry.title,
      }),
    );
  }
  return tr.doc;
}

/**
 * Milkdown's default link mark can consume `kind://id` links before the mention
 * mark parser sees them. Normalize such links into mention marks after parse.
 */
function normalizeMentionLinks(view: any): boolean {
  const state = view?.state;
  const linkType = state?.schema?.marks?.link;
  const mentionType = state?.schema?.marks?.mention;
  if (!linkType || !mentionType) return false;

  const matches: Array<{
    pos: number;
    size: number;
    kind: string;
    id: string;
    title: string;
  }> = [];

  state.doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.marks?.length) return;
    const link = node.marks.find((mark: any) => mark.type === linkType);
    const match = link && entityLinkRegex.exec(String(link.attrs?.href ?? ''));
    if (!match) return;
    matches.push({
      pos,
      size: node.nodeSize,
      kind: match[1],
      id: match[2],
      title: link.attrs?.title || node.text,
    });
  });

  if (matches.length === 0) return false;

  let tr = state.tr;
  for (const entry of matches) {
    tr = tr.removeMark(entry.pos, entry.pos + entry.size, linkType);
    tr = tr.addMark(
      entry.pos,
      entry.pos + entry.size,
      mentionType.create({
        kind: entry.kind,
        id: entry.id,
        href: null,
        title: entry.title,
      }),
    );
  }
  view.dispatch(tr);
  return true;
}

const mentionNormalizePlugin = $prose(
  () =>
    new Plugin({
      key: new PluginKey('mention-link-normalize'),
      view(editorView) {
        const normalize = () => normalizeMentionLinks(editorView);
        queueMicrotask(normalize);
        return {
          update(view, previousState) {
            if (view.state.doc !== previousState.doc) {
              queueMicrotask(() => normalizeMentionLinks(view));
            }
          },
        };
      },
    }),
);

// 2. Register the mark in a Crepe feature
export const mentionFeature = (ctx: any) => {
  ctx.use(mentionMark);
  ctx.use(mentionNormalizePlugin);
};

function mentionIcon(svg: string) {
  return svg.replace('class="', 'class="mention-tabler-icon ');
}

const mentionIcons: Record<string, string> = {
  note: iconNote,
  party: iconUsers,
  monster: iconGhost,
  encounter: iconSwords,
  location: iconMap,
};

const MENTIONABLE_ORDER = ['note', 'party', 'monster', 'encounter', 'location'];
const MENTIONABLE_KINDS = new Set(MENTIONABLE_ORDER);

const mentionKinds = featureLinkKinds
  .filter((option) => MENTIONABLE_KINDS.has(option.kind))
  .sort(
    (a, b) =>
      MENTIONABLE_ORDER.indexOf(a.kind) - MENTIONABLE_ORDER.indexOf(b.kind),
  )
  .map((option) => ({
    kind: option.kind,
    label: option.labelKey,
    icon: mentionIcon(mentionIcons[option.kind] ?? iconNote),
  }));

function getEditorView(ctx: any) {
  for (const key of [editorViewCtx, 'editorView', 'view']) {
    try {
      const view = ctx?.get?.(key);
      if (view?.state) return view;
    } catch {
      // Try the next context key.
    }
  }
  return null;
}

function isMentionMark(mark: any, kind: string) {
  return mark?.type?.name === 'mention' && mark.attrs?.kind === kind;
}

export function isMentionActive(ctx: any, kind: string): boolean {
  const editorView = getEditorView(ctx);
  const state = editorView?.state;
  if (!state?.selection) return false;

  const { selection, storedMarks, doc } = state;

  if (selection.empty) {
    const marks = storedMarks || selection.$from?.marks?.() || [];
    return marks.some((mark: any) => isMentionMark(mark, kind));
  }

  let active = false;
  doc?.nodesBetween?.(selection.from, selection.to, (node: any) => {
    if (
      node.isText &&
      node.marks?.some((mark: any) => isMentionMark(mark, kind))
    ) {
      active = true;
    }
  });
  return active;
}

/** Remove the mention mark of `kind` from the cursor/selection. */
export function clearMentionMark(ctx: any, kind: string): boolean {
  const editorView = getEditorView(ctx);
  const state = editorView?.state;
  const mentionType = state?.schema?.marks?.mention;
  if (!state?.selection || !mentionType) return false;

  const { selection } = state;
  let from = selection.from;
  let to = selection.to;

  if (selection.empty) {
    const $from = selection.$from;
    const parentStart = $from.start();
    let found = false;
    $from.parent?.forEach?.((node: any, offset: number) => {
      const start = parentStart + offset;
      const end = start + node.nodeSize;
      if (
        selection.from >= start &&
        selection.from <= end &&
        node.isText &&
        node.marks?.some((mark: any) => isMentionMark(mark, kind))
      ) {
        from = start;
        to = end;
        found = true;
      }
    });
    if (!found) return false;
  }

  if (from === to) return false;
  editorView.dispatch(state.tr.removeMark(from, to, mentionType));
  editorView.focus?.();
  return true;
}

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
      active: (ctx: any) => isMentionActive(ctx, kind),
      onRun: (ctx: any) =>
        isMentionActive(ctx, kind)
          ? clearMentionMark(ctx, kind)
          : insertMentionMark(ctx, kind, label, 'Toolbar'),
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
      onRun: (ctx: any) => {
        clearSlashMenuText(ctx);
        insertMentionMark(ctx, kind, label, 'BlockEdit');
      },
    });
  });
};
