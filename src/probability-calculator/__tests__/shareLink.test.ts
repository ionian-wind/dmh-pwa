import { describe, expect, it } from 'vitest';
import {
  buildShareUrl,
  decodeSource,
  encodeSource,
  sourceFromHash,
} from '../shareLink';

describe('probability calculator share links', () => {
  it('round-trips source code through base64', () => {
    const source = 'output 3d6\n\\ привет \\';
    const encoded = encodeSource(source);
    expect(encoded).not.toBe(source);
    expect(decodeSource(encoded)).toBe(source);
  });

  it('decodes a source program from a code hash', () => {
    const source = 'output [highest 3 of 4d6]';
    expect(sourceFromHash(`#code=${encodeSource(source)}`)).toBe(source);
    expect(sourceFromHash('#something-else')).toBeNull();
    expect(sourceFromHash('#code=not-base64!')).toBeNull();
  });

  it('builds a URL with a code hash', () => {
    const source = 'output 1d20';
    const url = buildShareUrl(
      source,
      'https://example.com/dmh-pwa/probability-calculator',
    );
    expect(url).toContain(
      'https://example.com/dmh-pwa/probability-calculator#code=',
    );
    expect(new URL(url).hash).toBe(`#code=${encodeSource(source)}`);
  });
});
