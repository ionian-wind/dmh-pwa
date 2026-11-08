import { createApp, h, reactive } from 'vue';
import { $nodeSchema, $remark, $view } from '@milkdown/utils';
import { editorViewCtx } from '@milkdown/kit/core';
import type { Node } from '@milkdown/kit/prose/model';
import type { EditorView } from '@milkdown/kit/prose/view';
import type { NodeViewConstructor } from '@milkdown/kit/prose/view';
import i18n from '@/i18n';
import type { Drawing } from '@/types';
import { deleteDrawing, getDrawing } from '@/drawings/storage';
import {
  drawingMarkdownUrl,
  parseDrawingMarkdownUrl,
} from '@/drawings/markdown';
import DrawingBlockView from '../DrawingBlockView.vue';
import { brushIcon } from '../tablerIcons';
import { clearSlashMenuText } from './slashMenu';

export interface DrawingModalRequest {
  ctx: any;
  drawingId?: string;
  onSaved?: (drawing: Drawing) => void;
}

let drawingModalTrigger: ((request: DrawingModalRequest) => void) | null = null;

export function registerDrawingModalTrigger(
  trigger: typeof drawingModalTrigger,
) {
  drawingModalTrigger = trigger;
}

export function unregisterDrawingModalTrigger(
  trigger: typeof drawingModalTrigger,
) {
  if (drawingModalTrigger === trigger) {
    drawingModalTrigger = null;
  }
}

export function requestDrawingModal(request: DrawingModalRequest) {
  drawingModalTrigger?.(request);
}

function walkReplaceDrawing(node: any) {
  if (!Array.isArray(node.children)) return;
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (child.type === 'paragraph') {
      const meaningful = (child.children ?? []).filter(
        (entry: any) =>
          !(entry.type === 'text' && String(entry.value ?? '').trim() === ''),
      );
      const image = meaningful.length === 1 ? meaningful[0] : null;
      const id =
        image?.type === 'image'
          ? parseDrawingMarkdownUrl(String(image.url ?? ''))
          : null;
      if (id) {
        node.children[index] = {
          type: 'drawing-block',
          id,
          caption: image.title ?? '',
        };
        continue;
      }
    }
    walkReplaceDrawing(child);
  }
}

export const drawingRemark = $remark('remark-drawing', () => () => {
  return (ast: any) => walkReplaceDrawing(ast);
});

export const drawingSchema = $nodeSchema('drawing-block', () => ({
  inline: false,
  group: 'block',
  selectable: true,
  draggable: true,
  isolating: true,
  atom: true,
  marks: '',
  attrs: {
    id: { default: '', validate: 'string' },
    caption: { default: '', validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'div[data-drawing-id]',
      getAttrs: (dom: HTMLElement) => ({
        id: dom.getAttribute('data-drawing-id') || '',
        caption: dom.getAttribute('data-drawing-caption') || '',
      }),
    },
  ],
  toDOM: (node: any) => [
    'div',
    {
      'data-drawing-id': node.attrs.id,
      'data-drawing-caption': node.attrs.caption,
    },
  ],
  parseMarkdown: {
    match: ({ type }: any) => type === 'drawing-block',
    runner: (state: any, node: any, type: any) => {
      state.addNode(type, {
        id: String(node.id ?? ''),
        caption: String(node.caption ?? ''),
      });
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'drawing-block',
    runner: (state: any, node: any) => {
      state.openNode('paragraph');
      state.addNode('image', undefined, undefined, {
        url: drawingMarkdownUrl(node.attrs.id),
        alt: 'drawing',
        title: node.attrs.caption,
      });
      state.closeNode();
    },
  },
}));

export const drawingView = $view(
  drawingSchema.node,
  (ctx): NodeViewConstructor => {
    return (
      initialNode: Node,
      view: EditorView,
      getPos: () => number | undefined,
    ) => {
      const state = reactive({
        drawingId: String(initialNode.attrs.id ?? ''),
        preview: '',
        caption: String(initialNode.attrs.caption ?? ''),
        readonly: !view.editable,
        setAttr: (attr: string, value: unknown) => {
          if (!view.editable) return;
          const pos = getPos();
          if (pos == null) return;
          view.dispatch(view.state.tr.setNodeAttribute(pos, attr, value));
        },
        onEdit: () => {
          requestDrawingModal({
            ctx,
            drawingId: state.drawingId,
            onSaved: (drawing) => {
              state.preview = drawing.preview;
            },
          });
        },
        onDelete: () => {
          const id = state.drawingId;
          void deleteDrawing(id).then(() => {
            const pos = getPos();
            if (pos == null) return;
            const node = view.state.doc.nodeAt(pos);
            if (!node) return;
            view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize));
            view.focus();
          });
        },
      });

      const loadPreview = async () => {
        const drawing = await getDrawing(state.drawingId);
        state.preview = drawing?.preview ?? '';
      };
      void loadPreview();

      const dom = document.createElement('div');
      dom.className = 'milkdown-drawing-block';
      const app = createApp({
        render: () => h(DrawingBlockView, state),
      });
      app.use(i18n);
      app.mount(dom);

      return {
        dom,
        update: (updatedNode: Node) => {
          if (updatedNode.type !== initialNode.type) return false;
          const nextId = String(updatedNode.attrs.id ?? '');
          if (nextId !== state.drawingId) {
            state.drawingId = nextId;
            void loadPreview();
          }
          state.caption = String(updatedNode.attrs.caption ?? '');
          state.readonly = !view.editable;
          return true;
        },
        stopEvent: (event: Event) => {
          const target = event.target as HTMLElement | null;
          return (
            target instanceof HTMLInputElement ||
            !!target?.closest?.('.drawing-block-actions')
          );
        },
        destroy: () => {
          app.unmount();
          dom.remove();
        },
      };
    };
  },
);

export const drawingPlugins = [drawingRemark, drawingSchema, drawingView];

export const drawingFeature = (editor: any) => {
  editor.use(drawingPlugins);
};

export function insertDrawingNode(ctx: any, id: string, caption = '') {
  const view = ctx.get(editorViewCtx);
  const node = drawingSchema.type(ctx).create({ id, caption });
  const { state, dispatch } = view;
  const pos = state.selection.from;
  dispatch(state.tr.insert(pos, node).scrollIntoView());
  view.focus();
}

export function buildDrawingMenu(
  builder: any,
  translate: (key: string) => string,
) {
  let advanced: any;
  try {
    advanced = builder.getGroup('advanced');
  } catch {
    return;
  }
  advanced.addItem('drawing', {
    label: translate('drawing.add'),
    icon: brushIcon,
    onRun: (ctx: any) => {
      clearSlashMenuText(ctx);
      requestDrawingModal({ ctx });
    },
  });
}
