import { describe, expect, it } from 'vitest';
import {
  getMentionableEntities,
  parseMarkdown,
  sanitizeMarkdownHtml,
} from '@/utils/markdownParser';

describe('markdown parser branch coverage', () => {
  it('renders ordinary and empty image sources without deferring them', () => {
    const ordinary = parseMarkdown('![plain](https://example.com/image.png)');
    expect(ordinary).toContain('src="https://example.com/image.png"');
    expect(ordinary).not.toContain('data-drawing-src');
    expect(ordinary).not.toContain('data-file-src');

    const empty = parseMarkdown('![empty]()');
    expect(empty).toContain('<img');
    expect(empty).toContain('alt="empty"');
  });

  it('handles list items whose first inline child is not text', () => {
    const bold = parseMarkdown('- **Bold item**');
    expect(bold).toContain('<strong>Bold item</strong>');
    expect(bold).not.toContain('task-list-item');
    expect(bold).not.toContain('task-list-checkbox');

    const html = parseMarkdown('- <span>html item</span>');
    expect(html).not.toContain('task-list-item');
  });

  it('does not treat checkbox-like text without trailing space as a task', () => {
    const result = parseMarkdown('- [x]');
    expect(result).toContain('<li>[x]</li>');
    expect(result).not.toContain('task-list-checkbox');
  });

  it('renders task checkboxes next to inline formatting', () => {
    const result = parseMarkdown('- [x] **Bold task**');
    expect(result).toMatch(
      /<input type="checkbox" (checked disabled|disabled checked)/,
    );
    expect(result).toContain('<strong>Bold task</strong>');
  });

  it('supports header anchors with inline formatting and leaves other markers alone', () => {
    const formatted = parseMarkdown('# **Bold** {#note-2}');
    expect(formatted).toContain(
      '<h1 id="note-2" data-id="2" data-kind="note">',
    );
    expect(formatted).toContain('<strong>Bold</strong>');
    expect(formatted).not.toContain('{#note-2}');

    const suffix = parseMarkdown('# Plain {#note-3} suffix');
    expect(suffix).not.toContain('id="note-3"');
    expect(suffix).toContain('{#note-3} suffix');

    const plain = parseMarkdown('# Plain heading');
    expect(plain).toContain('<h1>Plain heading</h1>');
    expect(plain).not.toContain('data-kind');
  });

  it('handles tag boundaries and rejects brace and non-tag contexts', () => {
    expect(parseMarkdown('#alpha')).toContain('href="/notes?tag=alpha"');
    expect(parseMarkdown('(#beta)')).toContain('href="/notes?tag=beta"');

    const inBrace = parseMarkdown('text {#gamma');
    expect(inBrace).not.toContain('tag-link');
    expect(inBrace).toContain('{#gamma');

    const noMatch = parseMarkdown('text #!');
    expect(noMatch).not.toContain('tag-link');
    expect(noMatch).toContain('#!');

    const midWord = parseMarkdown('word#delta');
    expect(midWord).not.toContain('tag-link');
  });

  it('keeps parsing tags inside link labels', () => {
    const result = parseMarkdown('[see #label](https://example.com)');

    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('class="tag-link"');
    expect(result).toContain('data-tag="label"');
  });

  it('removes nested dangerous markup and unsafe attributes', () => {
    const html = [
      '<div><custom-tag>Text</custom-tag><empty-tag></empty-tag><script>bad()</script></div>',
      '<form><button>Go</button></form>',
      '<a href="vbscript:bad">VBS</a>',
      '<img src="data:text/html;base64,abc" alt="bad">',
      '<input type="checkbox" onclick="evil()" disabled>',
    ].join('');

    const result = sanitizeMarkdownHtml(html);

    expect(result).toContain('<div>Text</div>');
    expect(result).not.toContain('<empty-tag>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('<form');
    expect(result).not.toContain('<button');
    expect(result).toContain('<a>VBS</a>');
    expect(result).not.toContain('vbscript:');
    expect(result).toContain('<img alt="bad">');
    expect(result).not.toContain('data:text/html');
    expect(result).not.toContain('onclick');
    expect(result).toContain('type="checkbox"');
    expect(result).toContain('disabled');
  });

  it('exposes metadata only for supported entity kinds', () => {
    expect(getMentionableEntities('note')).toBeTruthy();
    expect(getMentionableEntities('location')).toBeTruthy();
    expect(getMentionableEntities('playlist')).toMatchObject({
      target: 'jukebox',
    });
    expect(getMentionableEntities('unknown')).toBeUndefined();
  });
});
