import { describe, expect, it } from 'vitest';

import { extractHashtags, mergeHashtags, removeHashtag } from '@/utils/tags';

describe('hashtags', () => {
  it('extracts unique inline tags and ignores headings', () => {
    expect(
      extractHashtags(
        '# Heading\nTravel to #harbor and #forest. Also #harbor and #Подземелье.',
      ),
    ).toEqual(['harbor', 'forest', 'Подземелье']);
  });

  it('ignores lines without tags', () => {
    expect(extractHashtags('')).toEqual([]);
    expect(extractHashtags('# only a heading')).toEqual([]);
  });

  it('merges new tags without duplicates', () => {
    expect(mergeHashtags(['harbor'], 'Visit #harbor and #forest')).toEqual([
      'harbor',
      'forest',
    ]);
  });

  it('strips hashtag markers while keeping the text', () => {
    const content = removeHashtag(
      'Visit #harbor and #forest. Return to #harbor.',
      'harbor',
    );

    expect(content).toBe('Visit harbor and #forest. Return to harbor.');
  });
});
