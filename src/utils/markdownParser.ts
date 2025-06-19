import MarkdownIt from 'markdown-it';
import type MarkdownItType from 'markdown-it';
import type { PluginSimple } from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItAttrs from 'markdown-it-attrs';
import { useModuleStore } from '@/stores/modules';
import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';

// --- Mention plugin for markdown-it ---
const mentionRegex = /\[\[([a-zA-Z]+):([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/g;

const mentionPlugin: PluginSimple = (md: MarkdownItType) => {
  md.inline.ruler.before('emphasis', 'mention', (state: any, silent: boolean) => {
    const pos = state.pos;
    const src = state.src;
    mentionRegex.lastIndex = 0;
    const match = mentionRegex.exec(src.slice(pos));
    if (!match || match.index !== 0) return false;
    if (!silent) {
      const token = state.push('mention', '', 0);
      token.meta = {
        kind: match[1],
        id: match[2],
        alias: match[3] || null,
        raw: match[0],
      };
      token.content = match[0];
    }
    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.mention = (tokens: any, idx: number) => {
    const { kind, id, alias } = tokens[idx].meta;
    const noteStore = useNoteStore();
    const moduleStore = useModuleStore();
    const partyStore = usePartyStore();
    const monsterStore = useMonsterStore();
    const encounterStore = useEncounterStore();
    const linkText = alias || null;
    const dataAttrs = `data-kind="${kind}" data-id="${id}"`;

    const { useStore } = getMentionableEntities(kind)
    
    
    switch (kind) {
      case 'note': {
        const note = noteStore.getById(id);
        if (note) {
          return `<a href="/notes/${id}" class="internal-link note-link" ${dataAttrs}>${linkText || note.title || kind + ':' + id}</a>`;
        }
        break;
      }
      case 'module': {
        const module = moduleStore.getById(id);
        if (module) {
          return `<a href="/modules/${id}" class="internal-link module-link" ${dataAttrs}>${linkText || module.name || kind + ':' + id}</a>`;
        }
        break;
      }
      case 'party': {
        const party = partyStore.getById(id);
        if (party) {
          return `<a href="/parties/${id}" class="internal-link party-link" ${dataAttrs}>${linkText || party.name || kind + ':' + id}</a>`;
        }
        break;
      }
      case 'monster': {
        const monster = monsterStore.getById(id);
        if (monster) {
          return `<a href="/monsters/${id}" class="internal-link monster-link" ${dataAttrs}>${linkText || monster.name || kind + ':' + id}</a>`;
        }
        break;
      }
      case 'encounter': {
        const encounter = encounterStore.getById(id);
        if (encounter) {
          return `<a href="/encounters/${id}" class="internal-link encounter-link" ${dataAttrs}>${linkText || encounter.name || kind + ':' + id}</a>`;
        }
        break;
      }
    }
    return linkText || kind + ':' + id;
  };
};

// --- External link plugin for markdown-it ---
const externalLinkPlugin: PluginSimple = (md: MarkdownItType) => {
  const defaultRender = md.renderer.rules.link_open || function(tokens: any, idx: number, options: any, env: any, self: any) {
    return self.renderToken(tokens, idx, options);
  };
  md.renderer.rules.link_open = function(tokens: any, idx: number, options: any, env: any, self: any) {
    const href = tokens[idx].attrGet('href');
    if (href && /^(https?:)?\/\//.test(href)) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
      tokens[idx].attrJoin('class', 'external-link');
    }
    return defaultRender(tokens, idx, options, env, self);
  };
};

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
});
md.use(mentionPlugin);
md.use(externalLinkPlugin);
md.use(markdownItAttrs);
md.use(markdownItAnchor, {
  // Use the existing id if present, otherwise generate
  slugify: s => s,
  permalink: false,
  // Don't overwrite ids already present in the HTML
  callback: (token, info) => {
    // If the token already has an id attribute, do nothing
    // (markdown-it-anchor will not overwrite it)
  }
});

export function parseMarkdown(text: string): string {
  return md.render(text || '');
}

// Extract all entity mentions of the form [[type:id]] from markdown text
export interface EntityRef {
  kind: string;
  id: string;
}

export function extractMentionedEntities(text: string): EntityRef[] {
  const mentionExtractRegex = /\[\[([a-zA-Z]+):([a-zA-Z0-9_-]+)(?:\|[^\]]+)?\]\]/g;
  const results: EntityRef[] = [];
  let match;
  while ((match = mentionExtractRegex.exec(text)) !== null) {
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
      target: 'notes'
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
