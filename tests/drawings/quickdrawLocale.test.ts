import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';

import { localizeQuickdraw } from '@/drawings/quickdrawLocale';

function flushMutations() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Quickdraw locale bridge', () => {
  it('translates existing and newly added Quickdraw chrome and restores English', async () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button title="Draw — D" aria-label="Draw — D"><span>Draw</span></button>
      <div>Keyboard shortcuts</div>
    `;
    const locale = ref('ru');
    const stop = localizeQuickdraw(root, locale);

    expect(root.querySelector('button')?.title).toBe('Рисовать — D');
    expect(root.textContent).toContain('Горячие клавиши');

    const added = document.createElement('button');
    added.title = 'Zoom to fit';
    added.textContent = 'Zoom to fit';
    root.appendChild(added);
    await flushMutations();

    expect(added.title).toBe('Вписать в экран');
    expect(added.textContent).toBe('Вписать в экран');

    locale.value = 'en';
    await nextTick();
    await flushMutations();

    expect(root.querySelector('button')?.title).toBe('Draw — D');
    expect(root.textContent).toContain('Keyboard shortcuts');

    stop();
  });
});
