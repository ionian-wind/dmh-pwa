import { marked, Renderer } from 'marked';
import type { Tokens } from 'marked';
import { useModuleStore } from '@/stores/modules';
import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';

export function parseMarkdown(text: string): string {
  const noteStore = useNoteStore();
  const moduleStore = useModuleStore();
  const partyStore = usePartyStore();
  const monsterStore = useMonsterStore();
  const encounterStore = useEncounterStore();

  const renderer = new Renderer();

  renderer.link = ({ href, text }: Tokens.Link) => {
    // Handle internal links
    if (href.startsWith('[[') && href.endsWith(']]')) {
      const content = href.slice(2, -2);
      const [type, id] = content.split(':');

      switch (type) {
        case 'note':
          const note = noteStore.notes.find(n => n.id === id);
          if (note) {
            return `<a href="/note/${note.id}" class="internal-link note-link">${text}</a>`;
          }
          break;
        case 'module':
          const module = moduleStore.modules.find(m => m.id === id);
          if (module) {
            return `<a href="/module/${module.id}" class="internal-link module-link">${text}</a>`;
          }
          break;
        case 'party':
          const party = partyStore.parties.find(p => p.id === id);
          if (party) {
            return `<a href="/party/${party.id}" class="internal-link party-link">${text}</a>`;
          }
          break;
        case 'monster':
          const monster = monsterStore.monsters.find(m => m.id === id);
          if (monster) {
            return `<a href="/monster/${monster.id}" class="internal-link monster-link">${text}</a>`;
          }
          break;
        case 'encounter':
          const encounter = encounterStore.encounters.find(e => e.id === id);
          if (encounter) {
            return `<a href="/encounter/${encounter.id}" class="internal-link encounter-link">${text}</a>`;
          }
          break;
      }
      // If no match found, return the original text
      return text;
    }

    // Handle external links
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="external-link">${text}</a>`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true
  });

  return marked.parse(text) as string;
}
