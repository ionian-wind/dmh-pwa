import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildMentionMenu,
  buildMentionToolbar,
  clearMentionMark,
  insertMentionCommand,
  isMentionActive,
  mentionMark,
  registerMentionPopupTrigger,
} from '@/components/common/milkdown/plugins/mention';

function createContext() {
  const tr = {
    delete: vi.fn().mockReturnThis(),
    insertText: vi.fn().mockReturnThis(),
    addMark: vi.fn().mockReturnThis(),
  };
  const state = {
    selection: { from: 0, to: 6 },
    doc: { textBetween: vi.fn(() => 'Goblin') },
    schema: { marks: { mention: { create: vi.fn((attrs) => ({ attrs })) } } },
    tr,
  };
  const editorView = {
    state,
    dispatch: vi.fn(),
    coordsAtPos: vi.fn(() => ({ top: 10, left: 20, bottom: 30 })),
    dom: {},
  };
  const commands = { call: vi.fn() };
  const ctx = {
    get: vi.fn(() => ({ ...editorView, call: commands.call })),
  };
  return { ctx, editorView, state, tr, commands };
}

function createBuilder() {
  const items: Array<{ kind: string; options: any }> = [];
  const group = {
    addItem: vi.fn((kind: string, options: any) => {
      items.push({ kind, options });
    }),
  };
  const builder = {
    addGroup: vi.fn(() => group),
  };
  return { builder, group, items };
}

describe('milkdown mention plugin helpers', () => {
  beforeEach(() => {
    registerMentionPopupTrigger(null);
    vi.clearAllMocks();
  });

  it('builds toolbar items for every mention kind', () => {
    const { builder, group, items } = createBuilder();
    buildMentionToolbar(builder);

    expect(builder.addGroup).toHaveBeenCalledWith(
      'mentions',
      'common.mentions',
    );
    expect(group.addItem).toHaveBeenCalledTimes(5);
    expect(items.map((item) => item.kind)).toEqual([
      'note',
      'party',
      'monster',
      'encounter',
      'location',
    ]);
    expect(items[0].options.active()).toBe(false);
  });

  it('opens the registered popup and inserts the selected mention', () => {
    const popup = vi.fn();
    registerMentionPopupTrigger(popup);
    const { builder, items } = createBuilder();
    buildMentionToolbar(builder);
    const { ctx, editorView, tr } = createContext();

    items[2].options.onRun(ctx);

    expect(popup).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'monster',
        mentions: [],
        position: { top: 34, left: 20 },
      }),
    );

    const popupOptions = popup.mock.calls[0][0];
    const inserted = popupOptions.onSelect({
      id: 'm1',
      title: 'Goblin',
      name: 'Goblin',
    });

    expect(inserted).toBe(true);
    expect(tr.delete).toHaveBeenCalledWith(0, 6);
    expect(tr.insertText).toHaveBeenCalledWith('Goblin', 0);
    expect(tr.addMark).toHaveBeenCalled();
    expect(editorView.dispatch).toHaveBeenCalledWith(tr);
  });

  it('builds block-edit menu items and falls back without a popup', () => {
    const { builder, group, items } = createBuilder();
    buildMentionMenu(builder);
    expect(group.addItem).toHaveBeenCalledTimes(5);

    const { ctx, editorView, tr, commands } = createContext();
    items[0].options.onRun(ctx);

    expect(commands.call).toHaveBeenCalled();
    expect(tr.insertText).toHaveBeenCalledWith('Goblin', 0);
    expect(editorView.dispatch).toHaveBeenCalledWith(tr);
  });

  it('returns false when the mention mark is unavailable', () => {
    const { builder, items } = createBuilder();
    buildMentionToolbar(builder);
    const { ctx, state } = createContext();
    state.schema.marks.mention = undefined as any;

    items[0].options.onRun(ctx);
    expect(state.tr.addMark).not.toHaveBeenCalled();
  });

  it('defines the mention mark DOM and markdown converters', () => {
    const mark = mentionMark as any;
    const schema = mark.key._defaultValue();

    expect(schema.attrs.kind.default).toBeNull();
    expect(
      schema.parseDOM[0].getAttrs({
        getAttribute: (name: string) =>
          ({ 'data-kind': 'monster', 'data-id': 'm1', href: 'x', title: 'T' })[
            name
          ] ?? null,
      }),
    ).toEqual({ kind: 'monster', id: 'm1', href: 'x', title: 'T' });

    expect(
      schema.toDOM({ attrs: { kind: 'monster', id: 'm1', href: null } }),
    ).toEqual([
      'a',
      {
        href: '/monsters/m1',
        'data-kind': 'monster',
        'data-id': 'm1',
        class: 'internal-link monster-link',
        title: undefined,
      },
      0,
    ]);
    expect(
      schema.toDOM({
        attrs: { kind: 'note', id: 'n1', href: 'note://n1', title: 'N' },
      })[1],
    ).toMatchObject({ href: '/notes/n1', title: 'N' });

    expect(schema.parseMarkdown.match({ type: 'link', url: 'note://n1' })).toBe(
      true,
    );
    expect(
      schema.parseMarkdown.match({ type: 'link', url: 'https://example.com' }),
    ).toBe(false);

    const state = {
      openMark: vi.fn(),
      next: vi.fn(),
      closeMark: vi.fn(),
    };
    const markType = { name: 'mention' };
    schema.parseMarkdown.runner(
      state,
      {
        url: 'monster://m1',
        title: 'Goblin',
        children: [],
      },
      markType,
    );
    expect(state.openMark).toHaveBeenCalledWith(markType, {
      kind: 'monster',
      id: 'm1',
      href: null,
      title: 'Goblin',
    });
    expect(state.next).toHaveBeenCalled();
    expect(state.closeMark).toHaveBeenCalled();

    expect(schema.toMarkdown.match({ type: { name: 'mention' } })).toBe(true);
    const writeState = { withMark: vi.fn() };
    schema.toMarkdown.runner(writeState, {
      type: { name: 'mention' },
      attrs: { kind: 'party', id: 'p1' },
    });
    expect(writeState.withMark).toHaveBeenCalledWith(
      expect.anything(),
      'link',
      undefined,
      { url: 'party://p1' },
    );
  });

  it('registers and runs the insert mention command', async () => {
    const commands = { create: vi.fn(), call: vi.fn() };
    const fakeCtx = {
      wait: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(() => commands),
    };

    const plugin = insertMentionCommand as any;
    await plugin(fakeCtx)();
    expect(commands.create).toHaveBeenCalled();

    const command = commands.create.mock.calls[0][1];
    const tr = { insertText: vi.fn().mockReturnThis() };
    const selectionState = { selection: { from: 3 }, tr };
    const dispatch = vi.fn();
    expect(command('Goblin')(selectionState, dispatch)).toBe(true);
    expect(tr.insertText).toHaveBeenCalledWith('Goblin', 3);
    expect(dispatch).toHaveBeenCalledWith(tr);

    expect(command('ignored')({ selection: null }, dispatch)).toBe(false);
    expect(command(42)(selectionState, dispatch)).toBe(true);
  });

  it('marks the matching mention kind active under the cursor', () => {
    const mark = { type: { name: 'mention' }, attrs: { kind: 'monster' } };
    const ctx = {
      get: () => ({
        state: {
          selection: { empty: true, $from: { marks: () => [mark] } },
          storedMarks: null,
          doc: {},
        },
      }),
    };

    expect(isMentionActive(ctx, 'monster')).toBe(true);
    expect(isMentionActive(ctx, 'note')).toBe(false);

    const { builder, items } = createBuilder();
    buildMentionToolbar(builder);
    expect(items[2].options.active(ctx)).toBe(true);
    expect(items[0].options.active(ctx)).toBe(false);
  });

  it('detects mentions inside a text selection', () => {
    const mark = { type: { name: 'mention' }, attrs: { kind: 'note' } };
    const ctx = {
      get: () => ({
        state: {
          selection: { empty: false, from: 0, to: 6 },
          storedMarks: null,
          doc: {
            nodesBetween: (_from: number, _to: number, cb: Function) =>
              cb({ isText: true, marks: [mark] }),
          },
        },
      }),
    };

    expect(isMentionActive(ctx, 'note')).toBe(true);
    expect(isMentionActive(ctx, 'party')).toBe(false);
  });

  it('clears a mention mark from the cursor', () => {
    const mentionType = { name: 'mention' };
    const mark = { type: mentionType, attrs: { kind: 'monster' } };
    const node = { isText: true, nodeSize: 6, marks: [mark] };
    const parent = {
      forEach: (cb: Function) => cb(node, 0),
    };
    const tr = { removeMark: vi.fn().mockReturnThis() };
    const view = {
      state: {
        schema: { marks: { mention: mentionType } },
        selection: { empty: true, from: 2, $from: { start: () => 0, parent } },
        tr,
      },
      dispatch: vi.fn(),
      focus: vi.fn(),
    };
    const ctx = { get: () => view };

    expect(clearMentionMark(ctx, 'monster')).toBe(true);
    expect(tr.removeMark).toHaveBeenCalledWith(0, 6, mentionType);
    expect(view.dispatch).toHaveBeenCalledWith(tr);
  });

  it('does nothing when the cursor is not inside that mention kind', () => {
    const mentionType = { name: 'mention' };
    const node = {
      isText: true,
      nodeSize: 6,
      marks: [{ type: mentionType, attrs: { kind: 'note' } }],
    };
    const parent = { forEach: (cb: Function) => cb(node, 0) };
    const view = {
      state: {
        schema: { marks: { mention: mentionType } },
        selection: { empty: true, from: 2, $from: { start: () => 0, parent } },
        tr: { removeMark: vi.fn() },
      },
      dispatch: vi.fn(),
      focus: vi.fn(),
    };

    expect(clearMentionMark({ get: () => view }, 'monster')).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});
