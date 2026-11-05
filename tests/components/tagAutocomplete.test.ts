import { describe, expect, it } from 'vitest';

import {
  findTagAutocomplete,
  findTagRanges,
} from '@/components/common/milkdown/plugins/tagAutocomplete';

describe('tag autocomplete query detection', () => {
  it('detects a tag query after whitespace', () => {
    expect(findTagAutocomplete('Travel to #har', 14)).toEqual({
      query: 'har',
      from: 10,
      to: 14,
    });
  });

  it('detects an empty query immediately after the hash', () => {
    expect(findTagAutocomplete('#', 1)).toEqual({
      query: '',
      from: 0,
      to: 1,
    });
  });

  it('supports unicode tag names', () => {
    expect(findTagAutocomplete('Путь #Подзем', 12)).toEqual({
      query: 'Подзем',
      from: 5,
      to: 12,
    });
  });

  it('ignores headings and mid-word hashes', () => {
    expect(findTagAutocomplete('# Heading', 9)).toBeNull();
    expect(findTagAutocomplete('word#tag', 8)).toBeNull();
    expect(findTagAutocomplete('plain text', 10)).toBeNull();
  });

  describe('tag decoration ranges', () => {
    it('finds all inline tags with their source ranges', () => {
      expect(findTagRanges('Travel #harbor and #forest')).toEqual([
        { tag: 'harbor', start: 7, end: 14 },
        { tag: 'forest', start: 19, end: 26 },
      ]);
    });

    it('does not treat headings or mid-word hashes as tags', () => {
      expect(findTagRanges('# Heading')).toEqual([]);
      expect(findTagRanges('word#tag')).toEqual([]);
    });
  });
});
