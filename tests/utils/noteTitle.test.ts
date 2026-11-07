import { describe, expect, it } from 'vitest';
import { noteDisplayTitle } from '@/utils/noteTitle';

function note(overrides: Record<string, unknown>) {
  return {
    title: '',
    content: '',
    ...overrides,
  };
}

describe('noteDisplayTitle', () => {
  it('uses the title when present', () => {
    expect(noteDisplayTitle(note({ title: 'Session notes' }))).toBe(
      'Session notes',
    );
  });

  it('falls back to the first non-empty content line', () => {
    expect(
      noteDisplayTitle(
        note({
          content: '\n<!-- dmh:block=abc -->\n# The harbor\nSecond line',
        }),
      ),
    ).toBe('The harbor');
  });

  it('crops a long first line with three dots', () => {
    const title = noteDisplayTitle(
      note({
        content:
          'A very long first line that should be cropped because it exceeds the limit',
      }),
    );
    expect(title.endsWith('...')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(40);
  });

  it('returns an empty string for empty notes', () => {
    expect(noteDisplayTitle(note({}))).toBe('');
    expect(noteDisplayTitle(null)).toBe('');
  });
});
