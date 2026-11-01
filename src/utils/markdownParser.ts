import MarkdownIt from 'markdown-it';
import type MarkdownItType from 'markdown-it';
import type { PluginSimple } from 'markdown-it';
import { useModuleStore } from '@/stores/modules';
import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';

// --- Internal Entity Link Plugin for markdown-it ---
const entityLinkRegex =
  /^(note|module|party|monster|encounter):\/\/([a-zA-Z0-9_-]+)$/;

const internalEntityLinkPlugin: PluginSimple = (md: MarkdownItType) => {
  const defaultRender =
    md.renderer.rules.link_open ||
    function (tokens: any, idx: number, options: any, _env: any, self: any) {
      return self.renderToken(tokens, idx, options);
    };
  md.renderer.rules.link_open = function (
    tokens: any,
    idx: number,
    options: any,
    _env: any,
    self: any,
  ) {
    const href = tokens[idx].attrGet('href');
    if (href) {
      const match = entityLinkRegex.exec(href);
      if (match) {
        const kind = match[1];
        const id = match[2];
        tokens[idx].attrSet('data-kind', kind);
        tokens[idx].attrSet('data-id', id);
        tokens[idx].attrJoin('class', `internal-link ${kind}-link`);
        // Set SPA route for href
        switch (kind) {
          case 'note':
            tokens[idx].attrSet('href', `/notes/${id}`);
            break;
          case 'module':
            tokens[idx].attrSet('href', `/modules/${id}`);
            break;
          case 'party':
            tokens[idx].attrSet('href', `/parties/${id}`);
            break;
          case 'monster':
            tokens[idx].attrSet('href', `/monsters/${id}`);
            break;
          case 'encounter':
            tokens[idx].attrSet('href', `/encounters/${id}`);
            break;
        }
      } else if (/^(https?:)?\/\//.test(href)) {
        // External link
        tokens[idx].attrSet('target', '_blank');
        tokens[idx].attrSet('rel', 'noopener noreferrer');
        tokens[idx].attrJoin('class', 'external-link');
      }
    }
    return defaultRender(tokens, idx, options, _env, self);
  };

  // Optionally, customize link text rendering for internal links
  const defaultTextRender =
    md.renderer.rules.text ||
    function (tokens: any, idx: number, _options: any, _env: any, self: any) {
      return self.renderToken(tokens, idx, _options);
    };
  md.renderer.rules.text = function (
    tokens: any,
    idx: number,
    _options: any,
    _env: any,
    _self: any,
  ) {
    // No-op, let markdown-it handle link text
    return md.utils.escapeHtml(tokens[idx].content);
  };
};

// --- Checkbox (Task List) plugin for markdown-it ---
const checkboxRegex = /^\s*\[([ xX])\]\s+/;

const checkboxPlugin: PluginSimple = (md: MarkdownItType) => {
  const originalListItemOpen =
    md.renderer.rules.list_item_open ||
    function (tokens: any, idx: number, _options: any, _env: any, self: any) {
      return self.renderToken(tokens, idx, _options);
    };
  md.renderer.rules.list_item_open = function (
    tokens: any,
    idx: number,
    _options: any,
    _env: any,
    _self: any,
  ) {
    const next = tokens[idx + 1];
    if (
      next &&
      next.type === 'inline' &&
      next.children &&
      next.children[0] &&
      next.children[0].type === 'text'
    ) {
      const match = checkboxRegex.exec(next.children[0].content);
      if (match) {
        tokens[idx].attrJoin('class', 'task-list-item');
      }
    }
    return originalListItemOpen(tokens, idx, _options, _env, _self);
  };
  md.renderer.rules.text = function (
    tokens: any,
    idx: number,
    _options: any,
    env: any,
    _self: any,
  ) {
    const token = tokens[idx];
    const match = checkboxRegex.exec(token.content);
    if (match) {
      const checked = match[1].toLowerCase() === 'x';
      const label = token.content.slice(match[0].length);
      const enabled = env && env.taskCheckboxEnabled === true;
      return `<label class=\"task-list-label\"><input type=\"checkbox\"${checked ? ' checked' : ''}${enabled ? '' : ' disabled'} class=\"task-list-checkbox\">${md.utils.escapeHtml(label)}</label>`;
    }
    return md.utils.escapeHtml(token.content);
  };
};

// --- Custom Header Plugin for {#KIND-id} headers ---
const headerIdRegex = /\s*\{#([a-zA-Z]+)-([a-zA-Z0-9_-]+)\}\s*$/;
const validKinds = ['note', 'module', 'party', 'monster', 'encounter'];

const customHeaderPlugin: PluginSimple = (md: MarkdownItType) => {
  // Patch the renderer for heading_open
  const originalHeadingOpen =
    md.renderer.rules.heading_open ||
    function (tokens: any, idx: number, _options: any, _env: any, self: any) {
      return self.renderToken(tokens, idx, _options);
    };
  md.renderer.rules.heading_open = function (
    tokens: any,
    idx: number,
    _options: any,
    _env: any,
    _self: any,
  ) {
    // Find the inline token for this heading
    const inlineToken = tokens[idx + 1];
    if (inlineToken && inlineToken.type === 'inline') {
      const content = inlineToken.content;
      const match = headerIdRegex.exec(content);
      if (match) {
        const kind = match[1];
        const id = match[2];
        if (validKinds.includes(kind)) {
          // Set id, data-id, data-kind attributes
          tokens[idx].attrSet('id', `${kind}-${id}`);
          tokens[idx].attrSet('data-id', id);
          tokens[idx].attrSet('data-kind', kind);
          // Remove the {#KIND-id} from the content
          inlineToken.content = content.replace(headerIdRegex, '').trim();
          if (Array.isArray(inlineToken.children)) {
            for (const child of inlineToken.children) {
              if (child.type === 'text') {
                child.content = child.content.replace(headerIdRegex, '').trim();
              }
            }
          }
        }
      }
    }
    return originalHeadingOpen(tokens, idx, _options, _env, _self);
  };
};

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
});
md.use(internalEntityLinkPlugin);
md.use(checkboxPlugin);
md.use(customHeaderPlugin);

const allowedTags = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'details',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'kbd',
  'label',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const dangerousTags = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'button',
]);

const globalAttributes = ['class', 'id', 'title', 'data-kind', 'data-id'];
const tagAttributes: Record<string, string[]> = {
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  input: ['type', 'checked', 'disabled'],
  code: ['class'],
  th: ['align'],
  td: ['align'],
};

function isSafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !(
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html')
  );
}

/**
 * Browser-safe sanitizer for markdown HTML. The fast path leaves ordinary
 * markdown output untouched; documents containing risky HTML are parsed and
 * filtered with DOMParser so no Node-only sanitizer is pulled into the bundle.
 */
export function sanitizeMarkdownHtml(html: string): string {
  const dangerous =
    /<\s*(script|iframe|object|embed|style|link|meta|base|form)\b|on[a-z]+\s*=|javascript:/i;
  if (!dangerous.test(html)) {
    return html;
  }

  if (typeof DOMParser === 'undefined') {
    return html.replace(
      /<\s*(script|iframe|object|embed|style|link|meta|base)[\s\S]*?<\s*\/\s*\1\s*>/gi,
      '',
    );
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const sanitizeNode = (element: Element) => {
    for (const child of Array.from(element.children)) {
      const tag = child.tagName.toLowerCase();

      if (dangerousTags.has(tag)) {
        child.remove();
        continue;
      }

      if (!allowedTags.has(tag)) {
        child.replaceWith(document.createTextNode(child.textContent || ''));
        continue;
      }

      if (tag === 'input' && child.getAttribute('type') !== 'checkbox') {
        child.remove();
        continue;
      }

      const allowed = new Set([
        ...globalAttributes,
        ...(tagAttributes[tag] || []),
      ]);
      for (const attribute of Array.from(child.attributes)) {
        const name = attribute.name.toLowerCase();
        if (!allowed.has(name) || name.startsWith('on')) {
          child.removeAttribute(attribute.name);
          continue;
        }
        if (
          (name === 'href' || name === 'src') &&
          !isSafeUrl(attribute.value)
        ) {
          child.removeAttribute(attribute.name);
        }
      }

      sanitizeNode(child);
    }
  };

  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

export function parseMarkdown(text: string, env?: unknown): string {
  return sanitizeMarkdownHtml(md.render(text || '', env));
}

/** Clean a value that will be inserted as HTML (e.g. encounter descriptions). */
export function sanitizeHtmlContent(html: string): string {
  return sanitizeMarkdownHtml(html || '');
}

// Extract all entity mentions of the form [title](type://id) from markdown text
export interface EntityRef {
  kind: string;
  id: string;
}

export function extractMentionedEntities(text: string): EntityRef[] {
  // Match [title](type://id)
  const entityLinkExtractRegex =
    /\[[^\]]*\]\((note|module|party|monster|encounter):\/\/([a-zA-Z0-9_-]+)\)/g;
  const results: EntityRef[] = [];
  let match;
  while ((match = entityLinkExtractRegex.exec(text)) !== null) {
    results.push({ kind: match[1], id: match[2] });
  }
  return results;
}

// --- Mentionable Entities Map ---
export function getMentionableEntities(kind: string) {
  return {
    note: {
      useStore: useNoteStore,
      titleKey: 'title',
      idKey: 'id',
      type: 'Note',
      target: 'notes',
    },
    module: {
      useStore: useModuleStore,
      titleKey: 'name',
      idKey: 'id',
      type: 'Module',
      target: 'modules',
    },
    party: {
      useStore: usePartyStore,
      titleKey: 'name',
      idKey: 'id',
      type: 'Party',
      target: 'parties',
    },
    monster: {
      useStore: useMonsterStore,
      titleKey: 'name',
      idKey: 'id',
      type: 'Monster',
      target: 'monsters',
    },
    encounter: {
      useStore: useEncounterStore,
      titleKey: 'name',
      idKey: 'id',
      type: 'Encounter',
      target: 'encounters',
    },
  }[kind];
}
