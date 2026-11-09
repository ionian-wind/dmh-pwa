import { describe, expect, it } from 'vitest';
import {
  ANYDICE_LANGUAGE_ID,
  createAnyDiceHighlightMode,
  highlightAnydice,
} from '../anydiceLanguage';

const colors = {
  text: '#111111',
  comment: '#008000',
  string: '#a31515',
  number: '#0086b3',
  variable: '#001080',
  keyword: '#000080',
};

describe('AnyDice syntax highlighting', () => {
  it('exposes the language id and a registered mode', () => {
    expect(ANYDICE_LANGUAGE_ID).toBe('anydice');
    expect(createAnyDiceHighlightMode()).toMatchObject({
      name: 'AnyDice',
      highlight: highlightAnydice,
    });
  });

  it('highlights comments, strings, numbers, variables and keywords', () => {
    const html = highlightAnydice(
      '\\ comment \\ output 3d6 named "roll" X: 1',
      colors,
    );

    expect(html).toContain('color: #008000');
    expect(html).toContain('color: #000080');
    expect(html).toContain('color: #0086b3');
    expect(html).toContain('color: #a31515');
    expect(html).toContain('color: #001080');
  });

  it('falls back when theme colours are missing', () => {
    const html = highlightAnydice('foo ! 1 "x" \\ comment \\', {
      text: '#111111',
    });
    expect(html).toContain('color: #111111');
    expect(html).toContain('foo');
    expect(html).toContain('!');
    expect(highlightAnydice('', colors)).toBe('');
  });

  it('escapes HTML in source text', () => {
    const html = highlightAnydice('output <script>', colors);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
  });
});
