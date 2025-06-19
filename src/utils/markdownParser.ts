import { marked, Renderer } from 'marked';
import type { Tokens } from 'marked';
import { useModuleStore } from '@/stores/modules';
import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { marked as markedInstance } from 'marked';

// --- Custom inline tokenizer for [[type:id]] links ---
const mentionRegex = /\[\[([a-zA-Z]+):([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/y;

const mentionExtension = {
  name: 'mention',
  level: 'inline' as const,
  start(src: string) {
    return src.indexOf('[[');
  },
  tokenizer(src: string) {
    mentionRegex.lastIndex = 0;
    const match = mentionRegex.exec(src);
    if (match) {
      return {
        type: 'mention',
        raw: match[0],
        kind: match[1],
        id: match[2],
        alias: match[3] || null,
        text: `${match[1]}:${match[2]}`,
        tokens: []
      };
    }
    return undefined;
  },
  renderer(token: any) {
    const noteStore = useNoteStore();
    const moduleStore = useModuleStore();
    const partyStore = usePartyStore();
    const monsterStore = useMonsterStore();
    const encounterStore = useEncounterStore();
    const { kind, id, text, alias } = token;
    const linkText = alias || null;
    switch (kind) {
      case 'note': {
        const note = noteStore.getNoteById(id);
        if (note) {
          return `<a href="/notes/${note.id}" class="internal-link note-link">${linkText || note.title || text}</a>`;
        }
        break;
      }
      case 'module': {
        const module = moduleStore.getModuleById(id);
        if (module) {
          return `<a href="/modules/${module.id}" class="internal-link module-link">${linkText || module.name || text}</a>`;
        }
        break;
      }
      case 'party': {
        const party = partyStore.getPartyById(id);
        if (party) {
          return `<a href="/parties/${party.id}" class="internal-link party-link">${linkText || party.name || text}</a>`;
        }
        break;
      }
      case 'monster': {
        const monster = monsterStore.getMonsterById(id);
        if (monster) {
          return `<a href="/monsters/${monster.id}" class="internal-link monster-link">${linkText || monster.name || text}</a>`;
        }
        break;
      }
      case 'encounter': {
        const encounter = encounterStore.getEncounterById(id);
        if (encounter) {
          return `<a href="/encounters/${encounter.id}" class="internal-link encounter-link">${linkText || encounter.name || text}</a>`;
        }
        break;
      }
    }
    // If not found, just render as plain text
    return linkText || text;
  }
};

marked.use({ extensions: [mentionExtension] });

// Custom renderer for external links
const renderer = new Renderer();
const originalLink = renderer.link;
renderer.link = function(token: Tokens.Link) {
  const { href, text } = token;
  if (href && /^(https?:)?\/\//.test(href)) {
    // External link
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="external-link">${text}</a>`;
  }
  // Internal link: fallback to default
  return originalLink.call(this, token);
};

marked.setOptions({ renderer });

export function parseMarkdown(text: string): string {
  // marked options are already set globally above
  return marked.parse(text) as string;
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
// Maps mention kind to { store, titleKey, idKey, type }
export function getMentionableEntities() {
  return {
    note: {
      useStore: useNoteStore,
      titleKey: 'title',
      idKey: 'id',
      type: 'Note',
    },
    module: {
      useStore: useModuleStore,
      titleKey: 'name',
      idKey: 'id',
      type: 'Module',
    },
    party: {
      useStore: usePartyStore,
      titleKey: 'name',
      idKey: 'id',
      type: 'Party',
    },
    monster: {
      useStore: useMonsterStore,
      titleKey: 'name',
      idKey: 'id',
      type: 'Monster',
    },
    encounter: {
      useStore: useEncounterStore,
      titleKey: 'name',
      idKey: 'id',
      type: 'Encounter',
    },
  };
}
