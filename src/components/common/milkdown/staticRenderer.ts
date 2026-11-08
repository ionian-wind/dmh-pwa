import { Crepe } from '@milkdown/crepe';
import { parserCtx, schemaCtx } from '@milkdown/kit/core';
import { DOMSerializer } from '@milkdown/kit/prose/model';
import { mentionFeature } from './plugins/mention';
import { normalizeMentionDoc } from './plugins/mention';
import { headingAnchorFeature } from './plugins/headingAnchor';
import { findTagRanges } from './plugins/tagDecoration';
import { READONLY_CREPE_FEATURES } from './features';

let staticCrepe: Crepe | null = null;
let staticCrepePromise: Promise<Crepe> | null = null;
let staticRoot: HTMLElement | null = null;

function getStaticRoot() {
  if (staticRoot) return staticRoot;
  staticRoot = document.createElement('div');
  staticRoot.setAttribute('data-milkdown-static-renderer', '');
  staticRoot.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;';
  document.body.appendChild(staticRoot);
  return staticRoot;
}

async function getStaticCrepe() {
  if (staticCrepe) return staticCrepe;
  if (!staticCrepePromise) {
    staticCrepePromise = (async () => {
      const crepe = new Crepe({
        root: getStaticRoot(),
        defaultValue: '',
        features: READONLY_CREPE_FEATURES,
      })
        .addFeature(mentionFeature)
        .addFeature(headingAnchorFeature);
      crepe.setReadonly(true);
      await crepe.create();
      staticCrepe = crepe;
      return crepe;
    })();
  }
  return staticCrepePromise;
}

function decorateTagLinks(container: HTMLElement) {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    const parent = text.parentElement;
    const name = parent?.tagName;
    if (
      text.nodeValue?.includes('#') &&
      parent &&
      !['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'A', 'CODE', 'PRE'].includes(
        name ?? '',
      ) &&
      !parent.closest('.tag-link')
    ) {
      textNodes.push(text);
    }
    node = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const value = textNode.nodeValue ?? '';
    const ranges = findTagRanges(value);
    if (ranges.length === 0) continue;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) {
        fragment.appendChild(
          document.createTextNode(value.slice(cursor, range.start)),
        );
      }
      const link = document.createElement('a');
      link.className = 'tag-link';
      link.dataset.tag = range.tag;
      link.href = `/notes?tag=${encodeURIComponent(range.tag)}`;
      link.textContent = value.slice(range.start, range.end);
      fragment.appendChild(link);
      cursor = range.end;
    }
    if (cursor < value.length) {
      fragment.appendChild(document.createTextNode(value.slice(cursor)));
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  }
}

function decorateTaskItems(container: HTMLElement) {
  container
    .querySelectorAll('li[data-item-type="task"]')
    .forEach((item: Element) => {
      const checked = item.getAttribute('data-checked') === 'true';
      const label = document.createElement('label');
      label.className = 'task-list-label';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'task-list-checkbox';
      input.checked = checked;
      input.disabled = true;
      label.appendChild(input);
      item.insertBefore(label, item.firstChild);
    });
}

function decorateExternalLinks(container: HTMLElement) {
  container.querySelectorAll('a[href]').forEach((anchor: Element) => {
    const href = anchor.getAttribute('href') ?? '';
    if (/^(https?:)?\/\//.test(href)) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

function decorateHtml(container: HTMLElement) {
  decorateTaskItems(container);
  decorateTagLinks(container);
  decorateExternalLinks(container);
  return container.innerHTML;
}

/**
 * Render Markdown to static HTML with the same Milkdown/Crepe schema used by
 * the editor. The renderer is a singleton hidden Crepe instance; parse and
 * serialize work does not remount an editor per document.
 */
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const crepe = await getStaticCrepe();
  return crepe.editor.action((ctx) => {
    const parser = ctx.get(parserCtx);
    const schema = ctx.get(schemaCtx);
    const doc = parser(markdown || '');
    const normalized = normalizeMentionDoc(doc, schema);
    const fragment = DOMSerializer.fromSchema(schema).serializeFragment(
      normalized.content,
    );
    const container = document.createElement('div');
    container.appendChild(fragment);
    return decorateHtml(container);
  });
}

/** Warm up the singleton renderer without keeping the result. */
export async function warmupStaticRenderer() {
  await renderMarkdownToHtml('');
}
