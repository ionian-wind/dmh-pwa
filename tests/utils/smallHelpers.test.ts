import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupAnchorScrollHandler } from '@/utils/anchorScroll';
import { scrollToHeading } from '@/utils/scrollToHeading';
import { cropTitle } from '@/utils/cropTitle';
import {
  debug,
  debugError,
  debugWarn,
} from '@/utils/debug';
import {
  DiceMissingDataError,
  DiceSyntaxError,
  DiceValidationError,
  DiceWarning,
} from '@/utils/dice-roller/lib/errors';

describe('small utility helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
    history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('crops long titles and leaves short titles untouched', () => {
    expect(cropTitle('Short')).toBe('Short');
    expect(cropTitle('A very long title that needs cropping')).toBe(
      'A very long title that ne…',
    );
    expect(cropTitle('abcdef', 3)).toBe('abc…');
  });

  it('scrolls to an anchor when navigating back to a hash', () => {
    const anchor = document.createElement('div');
    anchor.id = 'target';
    document.body.appendChild(anchor);
    history.replaceState({}, '', '/#target');

    setupAnchorScrollHandler();
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(anchor.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
    });
    anchor.remove();
  });

  it('retries the initial hash target until it appears', () => {
    history.replaceState({}, '', '/#late-anchor');
    setupAnchorScrollHandler();

    vi.advanceTimersByTime(150);
    const anchor = document.createElement('div');
    anchor.id = 'late-anchor';
    document.body.appendChild(anchor);

    vi.advanceTimersByTime(100);
    expect(anchor.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    anchor.remove();
  });

  it('stops retrying when the initial hash target never appears', () => {
    history.replaceState({}, '', '/#missing-anchor');
    setupAnchorScrollHandler();

    expect(() => vi.advanceTimersByTime(2500)).not.toThrow();
  });

  it('updates the router hash, scrolls and highlights the heading', async () => {
    const replace = vi.fn().mockResolvedValue(undefined);
    const heading = document.createElement('h2');
    history.replaceState({}, '', '/notes#other');

    await scrollToHeading('heading', { replace } as any, heading);

    expect(replace).toHaveBeenCalledWith({ hash: '#heading' });
    expect(heading.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(heading.classList.contains('highlight-anchor')).toBe(true);

    vi.advanceTimersByTime(1200);
    expect(heading.classList.contains('highlight-anchor')).toBe(false);
  });

  it('does not replace the router hash when it already matches', async () => {
    const replace = vi.fn();
    history.replaceState({}, '', '/notes#same');

    await scrollToHeading('same', { replace } as any);

    expect(replace).not.toHaveBeenCalled();
  });

  it('exposes dice error and warning types', () => {
    expect(new DiceSyntaxError('syntax').name).toBe('DiceSyntaxError');
    expect(new DiceValidationError('validation').name).toBe(
      'DiceValidationError',
    );
    expect(new DiceMissingDataError('missing').name).toBe(
      'DiceMissingDataError',
    );
    expect(new DiceWarning('careful').message).toBe('careful');
    expect(new DiceSyntaxError('x')).toBeInstanceOf(Error);
  });

  it('routes debug output through the console helpers', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    debug('log', 1);
    debugWarn('warn');
    debugError('error');

    expect(log).toHaveBeenCalledWith('log', 1);
    expect(warn).toHaveBeenCalledWith('warn');
    expect(error).toHaveBeenCalledWith('error');
  });

  it('loads the debug macro arithmetic module', async () => {
    await expect(
      import('@/utils/dice-roller/plugins/macros/debug-macro-arithmetic'),
    ).resolves.toBeTruthy();
  });
});
