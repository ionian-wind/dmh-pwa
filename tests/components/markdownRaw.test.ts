import { describe, expect, it } from 'vitest';

import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
} from '@/components/common/markdownRaw';

describe('raw markdown editor conversions', () => {
  it('converts markdown text to QEditor HTML', () => {
    expect(markdownToEditorHtml('first\nsecond <tag>')).toBe(
      'first<br>second &lt;tag&gt;',
    );
  });

  it('converts QEditor HTML back to markdown text', () => {
    expect(
      editorHtmlToMarkdown(
        '<div>first</div><div>second <strong>x</strong></div>',
      ),
    ).toBe('first\nsecond x');
    expect(editorHtmlToMarkdown('a<br>b')).toBe('a\nb');
  });

  it('removes the trailing block newline', () => {
    expect(editorHtmlToMarkdown('<p>one</p>')).toBe('one');
  });
});
