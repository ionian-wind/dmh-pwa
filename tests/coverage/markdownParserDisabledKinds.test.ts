import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:feature-links', () => ({
  featureLinkKinds: [
    {
      kind: 'note',
      labelKey: 'notes.title',
      icon: null,
      titleField: 'title',
      route: (id: string) => `/notes/${id}`,
      useStore: () => ({}),
    },
  ],
}));

import { getMentionableEntities, parseMarkdown } from '@/utils/markdownParser';

describe('markdown parser with disabled link kinds', () => {
  it('renders known-but-unregistered internal links as disabled', () => {
    const result = parseMarkdown('[Missing](party://p1)');

    expect(result).toContain('href=""');
    expect(result).toContain('aria-disabled="true"');
    expect(result).toContain('class="disabled-internal-link"');
    expect(result).not.toContain('data-kind');
    expect(result).not.toContain('data-id');
  });

  it('still renders enabled internal links normally', () => {
    const result = parseMarkdown('[Note](note://n1)');

    expect(result).toContain('href="/notes/n1"');
    expect(result).toContain('class="internal-link note-link"');
    expect(result).toContain('data-kind="note"');
    expect(result).toContain('data-id="n1"');
  });

  it('leaves header markers for kinds that are not registered', () => {
    const result = parseMarkdown('# Heading {#party-1}');

    expect(result).not.toContain('id="party-1"');
    expect(result).not.toContain('data-kind="party"');
    expect(result).toContain('{#party-1}');
    expect(getMentionableEntities('party')).toBeUndefined();
  });
});
