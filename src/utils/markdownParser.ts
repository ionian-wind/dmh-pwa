import { marked, Renderer } from 'marked';
import type { Tokens } from 'marked';
import { useModuleStore } from '@/stores/modules';
import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { marked as markedInstance } from 'marked';

// --- Custom inline tokenizer for [[type:id]] links ---
const mentionRegex = /\[\[([a-zA-Z]+):([a-zA-Z0-9_-]+)\]\]/y;

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
      console.log('Mention matched:', match);
      return {
        type: 'mention',
        raw: match[0],
        kind: match[1],
        id: match[2],
        text: `${match[1]}:${match[2]}`,
        tokens: []
      };
    }
    return undefined;
  },
  renderer(token: any) {
    console.log('Rendering mention token:', token);
    const noteStore = useNoteStore();
    const moduleStore = useModuleStore();
    const partyStore = usePartyStore();
    const monsterStore = useMonsterStore();
    const encounterStore = useEncounterStore();
    const { kind, id, text } = token;
    switch (kind) {
      case 'note': {
        const note = noteStore.notes.find(n => n.id === id);
        if (note) {
          return `<a href="/notes/${note.id}" class="internal-link note-link">${note.title || text}</a>`;
        }
        break;
      }
      case 'module': {
        const module = moduleStore.modules.find(m => m.id === id);
        if (module) {
          return `<a href="/modules/${module.id}" class="internal-link module-link">${module.name || text}</a>`;
        }
        break;
      }
      case 'party': {
        const party = partyStore.parties.find(p => p.id === id);
        if (party) {
          return `<a href="/parties/${party.id}" class="internal-link party-link">${party.name || text}</a>`;
        }
        break;
      }
      case 'monster': {
        const monster = monsterStore.monsters.find(m => m.id === id);
        if (monster) {
          return `<a href="/monsters/${monster.id}" class="internal-link monster-link">${monster.name || text}</a>`;
        }
        break;
      }
      case 'encounter': {
        const encounter = encounterStore.encounters.find(e => e.id === id);
        if (encounter) {
          return `<a href="/encounters/${encounter.id}" class="internal-link encounter-link">${encounter.name || text}</a>`;
        }
        break;
      }
    }
    // If not found, just render as plain text
    return text;
  }
};

marked.use({ extensions: [mentionExtension] });

// Custom renderer for external links
const renderer = new Renderer();
const originalLink = renderer.link;
renderer.link = function(href, title, text) {
  if (href && /^(https?:)?\/\//.test(href)) {
    // External link
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="external-link">${text}</a>`;
  }
  // Internal link: fallback to default
  return originalLink.call(this, href, title, text);
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
  const mentionRegex = /\[\[([a-zA-Z]+):([a-zA-Z0-9_-]+)\]\]/g;
  const results: EntityRef[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    results.push({ kind: match[1], id: match[2] });
  }
  return results;
}
