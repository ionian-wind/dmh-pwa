import { parseMarkdown } from '@/utils/markdownParser';

// Mock the stores
jest.mock('@/stores/notes', () => ({
  useNoteStore: () => ({
    notes: [
      { id: 'note-1', title: 'Test Note', content: 'Test content' },
      { id: 'note-2', title: 'Another Note', content: 'Another content' }
    ]
  })
}));

jest.mock('@/stores/modules', () => ({
  useModuleStore: () => ({
    modules: [
      { id: 'module-1', name: 'Test Module', description: 'Test description' },
      { id: 'module-2', name: 'Another Module', description: 'Another description' }
    ]
  })
}));

jest.mock('@/stores/parties', () => ({
  usePartyStore: () => ({
    parties: [
      { id: 'party-1', name: 'Test Party', characters: [] },
      { id: 'party-2', name: 'Another Party', characters: [] }
    ]
  })
}));

jest.mock('@/stores/monsters', () => ({
  useMonsterStore: () => ({
    monsters: [
      { id: 'monster-1', name: 'Test Monster', type: 'Beast', description: 'Test description' },
      { id: 'monster-2', name: 'Another Monster', type: 'Humanoid', description: 'Another description' }
    ]
  })
}));

jest.mock('@/stores/encounters', () => ({
  useEncounterStore: () => ({
    encounters: [
      { id: 'encounter-1', name: 'Test Encounter', difficulty: 'medium', level: 5 },
      { id: 'encounter-2', name: 'Another Encounter', difficulty: 'hard', level: 10 }
    ]
  })
}));

describe('Markdown Parser', () => {
  describe('Basic Markdown Parsing', () => {
    it('should parse basic markdown text', () => {
      const input = '**Bold text** and *italic text*';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<strong>Bold text</strong>');
      expect(result).toContain('<em>italic text</em>');
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
      const input = 'Check this [[note:note-1]] for more info';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<a href="/note/note-1" class="internal-link note-link">');
      expect(result).toContain('Check this');
    });

    it('should parse module links', () => {
      const input = 'See [[module:module-1]] for details';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<a href="/module/module-1" class="internal-link module-link">');
      expect(result).toContain('See');
    });

    it('should parse party links', () => {
      const input = 'The [[party:party-1]] is ready';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<a href="/party/party-1" class="internal-link party-link">');
      expect(result).toContain('The');
    });

    it('should parse monster links', () => {
      const input = 'Fight the [[monster:monster-1]]';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<a href="/monster/monster-1" class="internal-link monster-link">');
      expect(result).toContain('Fight the');
    });

    it('should parse encounter links', () => {
      const input = 'Start [[encounter:encounter-1]]';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<a href="/encounter/encounter-1" class="internal-link encounter-link">');
      expect(result).toContain('Start');
    });

    it('should handle non-existent internal links', () => {
      const input = 'Check [[note:non-existent]]';
      const result = parseMarkdown(input);
      
      // Should return the original text without creating a link
      expect(result).toContain('Check');
      expect(result).not.toContain('<a href="/note/non-existent"');
    });

    it('should handle malformed internal links', () => {
      const input = 'Check [[invalid-format]]';
      const result = parseMarkdown(input);
      
      // Should return the original text
      expect(result).toContain('Check');
      expect(result).not.toContain('<a href=');
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
      const input = '**Important**: Check [[note:note-1]] for details about the [[monster:monster-1]].';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<strong>Important</strong>');
      expect(result).toContain('<a href="/note/note-1" class="internal-link note-link">');
      expect(result).toContain('<a href="/monster/monster-1" class="internal-link monster-link">');
    });

    it('should handle multiple links in one line', () => {
      const input = '[[note:note-1]] and [[module:module-1]] and [[party:party-1]]';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<a href="/note/note-1" class="internal-link note-link">');
      expect(result).toContain('<a href="/module/module-1" class="internal-link module-link">');
      expect(result).toContain('<a href="/party/party-1" class="internal-link party-link">');
    });

    it('should handle links within lists', () => {
      const input = '- Check [[note:note-1]]\n- See [[module:module-1]]';
      const result = parseMarkdown(input);
      
      expect(result).toContain('<ul>');
      expect(result).toContain('<a href="/note/note-1" class="internal-link note-link">');
      expect(result).toContain('<a href="/module/module-1" class="internal-link module-link">');
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
      const input = 'Check [[note: and [[module:module-1]]';
      const result = parseMarkdown(input);
      
      expect(result).toContain('Check [[note:');
      expect(result).toContain('<a href="/module/module-1" class="internal-link module-link">');
    });
  });
}); 