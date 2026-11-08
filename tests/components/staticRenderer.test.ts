import { describe, expect, it } from 'vitest';
import { renderMarkdownToHtml } from '@/components/common/milkdown/staticRenderer';

describe('static Milkdown renderer', () => {
  it('renders headings, tags, tasks and entity links to static HTML', async () => {
    const html = await renderMarkdownToHtml(
      [
        '# Static title',
        '',
        'Travel to #harbor.',
        '',
        '- [x] Done task',
        '- [ ] Open task',
        '',
        '[Goblin](pawn://m1)',
      ].join('\n'),
    );

    expect(html).toContain('<h1');
    expect(html).toContain('Static title');
    expect(html).toContain('class="tag-link"');
    expect(html).toContain('data-tag="harbor"');
    expect(html).toContain('task-list-checkbox');
    expect(html).toContain('internal-link pawn-link');
  });
});
