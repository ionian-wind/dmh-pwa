import { describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';
import { DiceSyntaxError } from '@/utils/dice-probability-calculator';
import { formatDiceSyntaxError } from '../syntaxErrors';

function translate(locale: 'en' | 'ru') {
  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, ru },
  });
  return i18n.global.t as unknown as (
    key: string,
    named?: Record<string, unknown>,
  ) => string;
}

function error(overrides: Partial<DiceSyntaxError> = {}) {
  return new DiceSyntaxError('raw chevrotain message', 13, 5, 13, 10, {
    code: 'unexpected-token',
    found: 'rrewr',
    foundKind: 'Word',
    expected: ['RCurly'],
    ...overrides,
  });
}

describe('syntax error formatting', () => {
  it('describes unexpected tokens with literal symbols', () => {
    expect(formatDiceSyntaxError(error(), translate('en'))).toBe(
      'Unexpected “rrewr”. Expected “}”.',
    );
  });

  it('localizes token descriptions', () => {
    expect(formatDiceSyntaxError(error(), translate('ru'))).toBe(
      'Неожиданный токен “rrewr”. Ожидалось: “}”.',
    );

    const expectedNumber = new DiceSyntaxError('raw', 1, 1, 1, 2, {
      code: 'unexpected-token',
      found: 'abc',
      expected: ['NumberLiteral'],
    });
    expect(formatDiceSyntaxError(expectedNumber, translate('en'))).toBe(
      'Unexpected “abc”. Expected a number.',
    );
    expect(formatDiceSyntaxError(expectedNumber, translate('ru'))).toBe(
      'Неожиданный токен “abc”. Ожидалось: число.',
    );
  });

  it('describes unexpected characters and end of input', () => {
    const character = new DiceSyntaxError('raw', 1, 8, 1, 9, {
      code: 'unexpected-character',
      found: '"',
    });
    expect(formatDiceSyntaxError(character, translate('en'))).toBe(
      'Unexpected character “"”.',
    );

    const end = new DiceSyntaxError('raw', 1, 11, 1, 12, {
      code: 'unexpected-end-of-input',
      foundKind: 'EOF',
      expected: ['NumberLiteral', 'LParen'],
    });
    expect(formatDiceSyntaxError(end, translate('en'))).toBe(
      'Unexpected end of input. Expected a number, “(”.',
    );
  });

  it('falls back to a localized generic message', () => {
    const invalid = new DiceSyntaxError('raw');
    expect(formatDiceSyntaxError(invalid, translate('en'))).toBe(
      'The expression contains a syntax error.',
    );
    expect(formatDiceSyntaxError(invalid, translate('ru'))).toBe(
      'В выражении есть синтаксическая ошибка.',
    );
  });
});
