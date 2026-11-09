import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => {
  const diceBox = {
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    roll: vi.fn(),
    clear: vi.fn(),
  };
  return {
    diceBox,
    DiceBox: vi.fn(function () {
      return diceBox;
    }),
  };
});

vi.mock('@3d-dice/dice-box', () => ({
  default: mocks.DiceBox,
}));

import DiceRollerPanel from '@/components/DiceRollerPanel.vue';

function mountPanel() {
  document
    .querySelectorAll('#dice-roller-surface, .dice-roller-panel')
    .forEach((element) => element.remove());
  return mount(DiceRollerPanel, {
    attachTo: document.body,
    global: { stubs: { teleport: false } },
  });
}

function button(label: string): HTMLButtonElement {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>('.dice-roller-button'),
  ).find((element) => {
    const first = element.querySelector('span')?.textContent?.trim();
    return first === label || element.textContent?.trim() === label;
  })!;
}

describe('DiceRollerPanel', () => {
  beforeEach(() => {
    mocks.diceBox.init.mockClear();
    mocks.diceBox.add.mockClear();
    mocks.diceBox.roll.mockClear();
    mocks.diceBox.clear.mockClear();
    mocks.DiceBox.mockClear();
  });

  it('initializes the 3D dice surface and rolls the requested die', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    expect(mocks.DiceBox).toHaveBeenCalledWith(
      expect.objectContaining({
        container: '#dice-roller-surface',
        assetPath: '/dmh-pwa/assets/dice-box/',
      }),
    );
    expect(mocks.diceBox.init).toHaveBeenCalled();

    button('d6').click();
    button('d6').click();
    button('d100').click();

    expect(mocks.diceBox.add).toHaveBeenNthCalledWith(1, '1d6');
    expect(mocks.diceBox.add).toHaveBeenNthCalledWith(2, '1d6');
    expect(mocks.diceBox.add).toHaveBeenNthCalledWith(3, '2d10');
    expect(mocks.diceBox.roll).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('clears dice and closes the panel', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    button('d6').click();
    button('d6').click();
    button('d100').click();
    mocks.diceBox.add.mockClear();
    button('Reroll').click();

    expect(mocks.diceBox.clear).toHaveBeenCalled();
    expect(mocks.diceBox.add.mock.calls).toEqual([['1d6'], ['1d6'], ['2d10']]);

    mocks.diceBox.add.mockClear();
    button('Clear').click();
    expect(mocks.diceBox.clear).toHaveBeenCalledTimes(2);
    button('Reroll').click();
    expect(mocks.diceBox.add).not.toHaveBeenCalled();

    document.querySelector<HTMLButtonElement>('.dice-roller-close')!.click();
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('keeps the rendering surface in viewport pixels on resize', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    });
    const wrapper = mountPanel();
    await flushPromises();

    const surface = document.getElementById('dice-roller-surface')!;
    expect(surface.style.width).toBe('800px');
    expect(surface.style.height).toBe('600px');

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 700,
    });
    window.dispatchEvent(new Event('resize'));

    expect(surface.style.width).toBe('1000px');
    expect(surface.style.height).toBe('700px');
    wrapper.unmount();
  });
});
