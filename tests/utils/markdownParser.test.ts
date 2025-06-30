import { vi } from 'vitest';
import { parseMarkdown, extractMentionedEntities } from '@/utils/markdownParser';

// Mock the stores
vi.mock('@/stores/notes', () => ({
  useNoteStore: () => ({
    notes: [
      { id: 'note-1', title: 'Test Note', content: 'Test content' },
      { id: 'note-2', title: 'Another Note', content: 'Another content' }
    ],
    getById: (id: string) => ({
      'note-1': { id: 'note-1', title: 'Test Note', content: 'Test content' },
      'note-2': { id: 'note-2', title: 'Another Note', content: 'Another content' }
    }[id] || null)
  })
}));

vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({
    modules: [
      { id: 'module-1', name: 'Test Module', description: 'Test description' },
      { id: 'module-2', name: 'Another Module', description: 'Another description' }
    ],
    getById: (id: string) => ({
      'module-1': { id: 'module-1', name: 'Test Module', description: 'Test description' },
      'module-2': { id: 'module-2', name: 'Another Module', description: 'Another description' }
    }[id] || null)
  })
}));

vi.mock('@/stores/parties', () => ({
  usePartyStore: () => ({
    parties: [
      { id: 'party-1', name: 'Test Party', characters: [] },
      { id: 'party-2', name: 'Another Party', characters: [] }
    ],
    getById: (id: string) => ({
      'party-1': { id: 'party-1', name: 'Test Party', characters: [] },
      'party-2': { id: 'party-2', name: 'Another Party', characters: [] }
    }[id] || null)
  })
}));

vi.mock('@/stores/monsters', () => ({
  useMonsterStore: () => ({
    monsters: [
      { id: 'monster-1', name: 'Test Monster', type: 'Beast', description: 'Test description' },
      { id: 'monster-2', name: 'Another Monster', type: 'Humanoid', description: 'Another description' }
    ],
    getById: (id: string) => ({
      'monster-1': { id: 'monster-1', name: 'Test Monster', type: 'Beast', description: 'Test description' },
      'monster-2': { id: 'monster-2', name: 'Another Monster', type: 'Humanoid', description: 'Another description' }
    }[id] || null)
  })
}));

vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => ({
    encounters: [
      { id: 'encounter-1', name: 'Test Encounter', difficulty: 'medium', level: 5 },
      { id: 'encounter-2', name: 'Another Encounter', difficulty: 'hard', level: 10 }
    ],
    getById: (id: string) => ({
      'encounter-1': { id: 'encounter-1', name: 'Test Encounter', difficulty: 'medium', level: 5 },
      'encounter-2': { id: 'encounter-2', name: 'Another Encounter', difficulty: 'hard', level: 10 }
    }[id] || null)
  })
}));

describe('Markdown Parser', () => {
  describe('Basic Markdown Parsing', () => {
    it('should parse basic markdown text', () => {
      const input = 'Hello, world!';
      const result = parseMarkdown(input);
      expect(result).toContain('Hello, world!');
    });

    it('should parse headings', () => {
      const input = '# Heading 1\n## Heading 2';
      const result = parseMarkdown(input);
      expect(result).toContain('<h1>Heading 1</h1>');
      expect(result).toContain('<h2>Heading 2</h2>');
    });

    it('should parse lists', () => {
      const input = '- Item 1\n- Item 2\n1. Numbered item';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>Numbered item</li>');
    });

    it('should parse code blocks', () => {
      const input = '```javascript\nconst x = 1;\n```';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<pre><code class="language-javascript">');
      expect(result).toContain('const x = 1;');
    });

    it('should parse inline code', () => {
      const input = 'Use `console.log()` for debugging';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<code>console.log()</code>');
    });
  });

  describe('Internal Links', () => {
    it('should parse note links', () => {
      const input = 'Check this [Test Note](note://note-1) for more info';
      const result = parseMarkdown(input);
      const anchor = result.match(/<a [^>]+>Test Note<\/a>/)[0];
      expect(anchor).toContain('href="/notes/note-1"');
      expect(anchor).toContain('class="internal-link note-link"');
      expect(anchor).toContain('data-kind="note"');
      expect(anchor).toContain('data-id="note-1"');
      expect(result).toContain('Check this');
    });

    it('should parse module links', () => {
      const input = 'See [Test Module](module://module-1) for details';
      const result = parseMarkdown(input);
      const anchor = result.match(/<a [^>]+>Test Module<\/a>/)[0];
      expect(anchor).toContain('href="/modules/module-1"');
      expect(anchor).toContain('class="internal-link module-link"');
      expect(anchor).toContain('data-kind="module"');
      expect(anchor).toContain('data-id="module-1"');
      expect(result).toContain('See');
    });

    it('should parse party links', () => {
      const input = 'The [Test Party](party://party-1) is ready';
      const result = parseMarkdown(input);
      const anchor = result.match(/<a [^>]+>Test Party<\/a>/)[0];
      expect(anchor).toContain('href="/parties/party-1"');
      expect(anchor).toContain('class="internal-link party-link"');
      expect(anchor).toContain('data-kind="party"');
      expect(anchor).toContain('data-id="party-1"');
      expect(result).toContain('The');
    });

    it('should parse monster links', () => {
      const input = 'Fight the [Test Monster](monster://monster-1)';
      const result = parseMarkdown(input);
      const anchor = result.match(/<a [^>]+>Test Monster<\/a>/)[0];
      expect(anchor).toContain('href="/monsters/monster-1"');
      expect(anchor).toContain('class="internal-link monster-link"');
      expect(anchor).toContain('data-kind="monster"');
      expect(anchor).toContain('data-id="monster-1"');
      expect(result).toContain('Fight the');
    });

    it('should parse encounter links', () => {
      const input = 'Start [Test Encounter](encounter://encounter-1)';
      const result = parseMarkdown(input);
      const anchor = result.match(/<a [^>]+>Test Encounter<\/a>/)[0];
      expect(anchor).toContain('href="/encounters/encounter-1"');
      expect(anchor).toContain('class="internal-link encounter-link"');
      expect(anchor).toContain('data-kind="encounter"');
      expect(anchor).toContain('data-id="encounter-1"');
      expect(result).toContain('Start');
    });

    it('should handle non-existent internal links', () => {
      const input = 'Check [Missing Note](note://non-existent)';
      const result = parseMarkdown(input);
      
      // Should return the original text without creating a link
      expect(result).toContain('Check');
      expect(result).toContain('<a href="/notes/non-existent"'); // Still renders as a link, but entity may not exist
    });

    it('should handle malformed internal links', () => {
      const input = 'Check [Invalid](invalid://format)';
      const result = parseMarkdown(input);
      expect(result).toContain('Check');
      // markdown-it will render a link for any [text](url), so check for the anchor
      expect(result).toContain('<a href="invalid://format">Invalid</a>');
    });

    it('should parse note links with alias', () => {
      const input = 'Check this [Alias Note](note://note-1) for more info';
      const result = parseMarkdown(input);
      const anchor = result.match(/<a [^>]+>Alias Note<\/a>/)[0];
      expect(anchor).toContain('href="/notes/note-1"');
      expect(anchor).toContain('class="internal-link note-link"');
      expect(anchor).toContain('data-kind="note"');
      expect(anchor).toContain('data-id="note-1"');
    });
  });

  describe('External Links', () => {
    it('should parse external links', () => {
      const input = 'Visit [Google](https://google.com)';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<a href="https://google.com" target="_blank" rel="noopener noreferrer" class="external-link">');
      expect(result).toContain('Visit');
    });

    it('should handle external links with special characters', () => {
      const input = 'Check [this page](https://example.com/path?param=value)';
      const result = parseMarkdown(input);
      
      expect(result).toContain('href="https://example.com/path?param=value"');
    });
  });

  describe('Mixed Content', () => {
    it('should handle mixed markdown and internal links', () => {
      const input = '**Important**: Check [Test Note](note://note-1) for details about the [Test Monster](monster://monster-1).';
      const result = parseMarkdown(input);
      expect(result).toContain('<strong>Important</strong>');
      const anchor1 = result.match(/<a [^>]+>Test Note<\/a>/)[0];
      expect(anchor1).toContain('href="/notes/note-1"');
      expect(anchor1).toContain('class="internal-link note-link"');
      expect(anchor1).toContain('data-kind="note"');
      expect(anchor1).toContain('data-id="note-1"');
      const anchor2 = result.match(/<a [^>]+>Test Monster<\/a>/)[0];
      expect(anchor2).toContain('href="/monsters/monster-1"');
      expect(anchor2).toContain('class="internal-link monster-link"');
      expect(anchor2).toContain('data-kind="monster"');
      expect(anchor2).toContain('data-id="monster-1"');
    });

    it('should handle multiple links in one line', () => {
      const input = '[Test Note](note://note-1) and [Test Module](module://module-1) and [Test Party](party://party-1)';
      const result = parseMarkdown(input);
      const anchor1 = result.match(/<a [^>]+>Test Note<\/a>/)[0];
      expect(anchor1).toContain('href="/notes/note-1"');
      expect(anchor1).toContain('class="internal-link note-link"');
      expect(anchor1).toContain('data-kind="note"');
      expect(anchor1).toContain('data-id="note-1"');
      const anchor2 = result.match(/<a [^>]+>Test Module<\/a>/)[0];
      expect(anchor2).toContain('href="/modules/module-1"');
      expect(anchor2).toContain('class="internal-link module-link"');
      expect(anchor2).toContain('data-kind="module"');
      expect(anchor2).toContain('data-id="module-1"');
      const anchor3 = result.match(/<a [^>]+>Test Party<\/a>/)[0];
      expect(anchor3).toContain('href="/parties/party-1"');
      expect(anchor3).toContain('class="internal-link party-link"');
      expect(anchor3).toContain('data-kind="party"');
      expect(anchor3).toContain('data-id="party-1"');
    });

    it('should handle links within lists', () => {
      const input = '- Check [Test Note](note://note-1)\n- See [Test Module](module://module-1)';
      const result = parseMarkdown(input);
      expect(result).toContain('<ul>');
      const anchor1 = result.match(/<a [^>]+>Test Note<\/a>/)[0];
      expect(anchor1).toContain('href="/notes/note-1"');
      expect(anchor1).toContain('class="internal-link note-link"');
      expect(anchor1).toContain('data-kind="note"');
      expect(anchor1).toContain('data-id="note-1"');
      const anchor2 = result.match(/<a [^>]+>Test Module<\/a>/)[0];
      expect(anchor2).toContain('href="/modules/module-1"');
      expect(anchor2).toContain('class="internal-link module-link"');
      expect(anchor2).toContain('data-kind="module"');
      expect(anchor2).toContain('data-id="module-1"');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = parseMarkdown('');
      expect(result).toBe('');
    });

    it('should handle string with only whitespace', () => {
      const result = parseMarkdown('   \n\t  ');
      expect(result).toBe('');
    });

    it('should handle plain text without markdown', () => {
      const input = 'Just plain text without any markdown formatting';
      const result = parseMarkdown(input);
      
      expect(result).toContain('Just plain text without any markdown formatting');
    });

    it('should handle partial internal link syntax', () => {
      const input = 'Check [note: and [Test Module](module://module-1)';
      const result = parseMarkdown(input);
      expect(result).toContain('Check [note:');
      const anchor = result.match(/<a [^>]+>Test Module<\/a>/)[0];
      expect(anchor).toContain('href="/modules/module-1"');
      expect(anchor).toContain('class="internal-link module-link"');
      expect(anchor).toContain('data-kind="module"');
      expect(anchor).toContain('data-id="module-1"');
    });
  });

  describe('Checkbox/Task List Plugin', () => {
    it('should render unchecked task list items as disabled checkboxes', () => {
      const input = '- [ ] Unchecked item';
      const result = parseMarkdown(input);
      expect(result).toContain('<ul');
      expect(result).toContain('<input type="checkbox" disabled class="task-list-checkbox">');
      expect(result).toContain('Unchecked item');
    });

    it('should render checked task list items as checked disabled checkboxes', () => {
      const input = '- [x] Checked item';
      const result = parseMarkdown(input);
      expect(result).toContain('<ul');
      expect(result).toMatch(/<input type="checkbox" (checked disabled|disabled checked) class="task-list-checkbox">/);
      expect(result).toContain('Checked item');
    });

    it('should render mixed checked and unchecked items', () => {
      const input = '- [ ] Unchecked\n- [x] Checked';
      const result = parseMarkdown(input);
      expect(result).toMatch(/<input type="checkbox" disabled class="task-list-checkbox">/);
      expect(result).toMatch(/<input type="checkbox" (checked disabled|disabled checked) class="task-list-checkbox">/);
    });

    it('should not affect normal lists', () => {
      const input = '- Not a task item';
      const result = parseMarkdown(input);
      expect(result).toContain('<ul');
      expect(result).toContain('<li>Not a task item</li>');
      expect(result).not.toContain('type="checkbox"');
    });

    it('should render enabled checkboxes if env.taskCheckboxEnabled is true', () => {
      const input = '- [x] Enabled checked item';
      const result = parseMarkdown(input, { taskCheckboxEnabled: true });
      expect(result).toContain('<input type="checkbox" checked class="task-list-checkbox">');
      expect(result).not.toContain('disabled');
    });

    it('should render enabled unchecked checkboxes if env.taskCheckboxEnabled is true', () => {
      const input = '- [ ] Enabled unchecked item';
      const result = parseMarkdown(input, { taskCheckboxEnabled: true });
      expect(result).toContain('<input type="checkbox" class="task-list-checkbox">');
      expect(result).not.toContain('disabled');
    });
  });

  describe('Markdown-it Attrs', () => {
    it('should NOT parse custom classes and ids on elements', () => {
      const input = '## Heading {.custom-class #custom-id}';
      const result = parseMarkdown(input);
      // Should not parse custom class/id, just render as plain heading
      expect(result).toContain('<h2>Heading {.custom-class #custom-id}</h2>');
    });
    it('should NOT parse span with class', () => {
      const input = 'A {span with="attr" .my-class}';
      const result = parseMarkdown(input);
      // Should not parse custom class, just render as plain text inside a paragraph
      expect(result).toContain('A {span with=&quot;attr&quot; .my-class}');
    });
  });

  describe('Heading ID behavior', () => {
    it('should support {#KIND-id} for valid kinds only', () => {
      const input = '# Some Note {#note-123}\n# Some Module {#module-456}\n# Not Special {#foo-789}';
      const result = parseMarkdown(input);
      expect(result).toContain('<h1 id="note-123" data-id="123" data-kind="note">Some Note</h1>');
      expect(result).toContain('<h1 id="module-456" data-id="456" data-kind="module">Some Module</h1>');
      // Should not parse for unknown kind
      expect(result).toContain('<h1>Not Special {#foo-789}</h1>');
      // Should not contain {#note-123} or {#module-456} in the heading text
      expect(result).not.toContain('Some Note {#note-123}');
      expect(result).not.toContain('Some Module {#module-456}');
    });
  });

  describe('Mention Extraction', () => {
    it('should extract mentioned entities from text', () => {
      const input = '[Test Note](note://note-1) and [Alias](monster://monster-2) and [Test Party](party://party-1)';
      const result = extractMentionedEntities(input);
      expect(result).toEqual([
        { kind: 'note', id: 'note-1' },
        { kind: 'monster', id: 'monster-2' },
        { kind: 'party', id: 'party-1' },
      ]);
    });
    it('should return empty array if no mentions', () => {
      const input = 'No mentions here!';
      const result = extractMentionedEntities(input);
      expect(result).toEqual([]);
    });
  });
}); 