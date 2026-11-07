import { $remark } from '@milkdown/utils';
import {
  headingIdGenerator,
  headingSchema,
} from '@milkdown/kit/preset/commonmark';
import { featureLinkKinds } from 'virtual:feature-links';

const HEADING_ANCHOR_PATTERN = /\s*\{#([a-zA-Z]+)-([a-zA-Z0-9_-]+)\}\s*$/;
const enabledKinds = new Set(featureLinkKinds.map((option) => option.kind));

export interface HeadingAnchor {
  kind: string;
  id: string;
}

/**
 * Extract a `{#kind-id}` suffix from a heading's last text child.
 * Returns the anchor data and mutates the child to remove the marker.
 */
export function extractHeadingAnchor(heading: any): HeadingAnchor | null {
  if (!heading || heading.type !== 'heading' || !heading.children?.length) {
    return null;
  }

  for (let index = heading.children.length - 1; index >= 0; index -= 1) {
    const child = heading.children[index];
    if (child?.type !== 'text' || typeof child.value !== 'string') continue;

    const match = HEADING_ANCHOR_PATTERN.exec(child.value);
    if (!match) return null;

    const kind = match[1];
    const id = match[2];
    if (!enabledKinds.has(kind)) return null;

    child.value = child.value.slice(0, match.index).trimEnd();
    return { kind, id };
  }

  return null;
}

function visitHeadings(node: any, visit: (heading: any) => void) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'heading') visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) visitHeadings(child, visit);
  }
}

export const headingAnchorRemark = $remark(
  'dmhHeadingAnchor',
  () => () => (tree: any) => {
    visitHeadings(tree, (heading) => {
      const anchor = extractHeadingAnchor(heading);
      if (!anchor) return;
      heading.data = {
        ...(heading.data ?? {}),
        dmhHeadingAnchor: anchor,
      };
    });
  },
);

export const headingAnchorSchema = headingSchema.extendSchema((prev) => {
  return (ctx) => {
    const base = prev(ctx);
    return {
      ...base,
      attrs: {
        ...base.attrs,
        anchorKind: { default: null, validate: 'string|null' },
        anchorId: { default: null, validate: 'string|null' },
      },
      toDOM: (node: any) => {
        const dom = base.toDOM?.(node);
        if (!Array.isArray(dom)) {
          return [`h${node.attrs.level}`, {}, 0];
        }
        const attrs = { ...(dom[1] ?? {}) };
        if (node.attrs.anchorKind && node.attrs.anchorId) {
          attrs['data-kind'] = node.attrs.anchorKind;
          attrs['data-id'] = node.attrs.anchorId;
        }
        return [dom[0], attrs, 0];
      },
      parseMarkdown: {
        ...base.parseMarkdown,
        runner: (state: any, node: any, type: any) => {
          const anchor = node.data?.dmhHeadingAnchor as
            HeadingAnchor | undefined;
          state.openNode(type, {
            level: node.depth,
            id: anchor ? `${anchor.kind}-${anchor.id}` : undefined,
            anchorKind: anchor?.kind ?? null,
            anchorId: anchor?.id ?? null,
          });
          state.next(node.children);
          state.closeNode();
        },
      },
      toMarkdown: {
        ...base.toMarkdown,
        runner: (state: any, node: any) => {
          state.openNode('heading', undefined, {
            depth: node.attrs.level,
          });
          state.next(node.content);
          if (node.attrs.anchorKind && node.attrs.anchorId) {
            state.addNode(
              'text',
              undefined,
              ` {#${node.attrs.anchorKind}-${node.attrs.anchorId}}`,
            );
          }
          state.closeNode();
        },
      },
    };
  };
});

export const headingAnchorFeature = (ctx: any) => {
  ctx.config((configCtx: any) => {
    configCtx.update(
      headingIdGenerator.key,
      (defaultGenerator: (node: any) => string) => (node: any) => {
        if (node.attrs.anchorKind && node.attrs.anchorId) {
          return `${node.attrs.anchorKind}-${node.attrs.anchorId}`;
        }
        return defaultGenerator(node);
      },
    );
  });
  ctx.use(headingAnchorRemark);
  ctx.use(headingAnchorSchema);
};
