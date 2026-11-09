import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
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

const QMenuStub = defineComponent({
  name: 'QMenu',
  props: { modelValue: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  template: '<div class="q-menu-stub"><slot /></div>',
});

function mountPanel() {
  document
    .querySelectorAll(
      '#dice-roller-surface, .dice-roller-anchor, .dice-roller-menu',
    )
    .forEach((element) => element.remove());
  return mount(DiceRollerPanel, {
    attachTo: document.body,
    props: { modelValue: true },
    global: { stubs: { teleport: false, QMenu: QMenuStub } },
  });
}

function button(label: string): HTMLElement {
  return Array.from(
    document.querySelectorAll<HTMLElement>('.dice-roller-item'),
  ).find((element) => {
    const first = element
      .querySelector('.dice-roller-label')
      ?.textContent?.trim();
    return first === label || element.textContent?.trim() === label;
  })!;
}

describe('DiceRollerPanel', () => {
  beforeAll(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      null as never,
    );
  });

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
        offscreen: false,
      }),
    );
    expect(mocks.diceBox.init).toHaveBeenCalled();

    button('d6').click();
    await flushPromises();
    button('d6').click();
    await flushPromises();
    button('d100').click();
    await flushPromises();

    expect(mocks.diceBox.add).toHaveBeenNthCalledWith(1, '1d6');
    expect(mocks.diceBox.add).toHaveBeenNthCalledWith(2, '1d6');
    expect(mocks.diceBox.add).toHaveBeenNthCalledWith(3, '2d10');
    expect(mocks.diceBox.roll).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('clears dice and rerolls the current pool', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    button('d6').click();
    await flushPromises();
    button('d6').click();
    await flushPromises();
    button('d100').click();
    await flushPromises();
    mocks.diceBox.add.mockClear();
    button('Reroll').click();
    await flushPromises();

    expect(mocks.diceBox.clear).toHaveBeenCalled();
    expect(mocks.diceBox.add.mock.calls).toEqual([['1d6'], ['1d6'], ['2d10']]);

    mocks.diceBox.add.mockClear();
    button('Clear').click();
    expect(mocks.diceBox.clear).toHaveBeenCalledTimes(2);
    button('Reroll').click();
    await flushPromises();
    expect(mocks.diceBox.add).not.toHaveBeenCalled();

    document.querySelector<HTMLElement>('.dice-roller-header button')!.click();
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);

    wrapper.unmount();
  });

  it('drags the menu by its header', async () => {
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
    await nextTick();

    const anchor = document.querySelector<HTMLElement>('.dice-roller-anchor')!;
    const beforeLeft = Number.parseFloat(anchor.style.left);
    const beforeTop = Number.parseFloat(anchor.style.top);
    const header = document.querySelector<HTMLElement>('.dice-roller-header')!;

    header.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 100,
        clientY: 500,
      }),
    );
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 150,
        clientY: 450,
      }),
    );
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    await nextTick();

    expect(Number.parseFloat(anchor.style.left)).toBe(beforeLeft + 50);
    expect(Number.parseFloat(anchor.style.top)).toBe(beforeTop - 50);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 300,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 200,
    });
    window.dispatchEvent(new Event('resize'));
    await nextTick();
    expect(Number.parseFloat(anchor.style.left)).toBeLessThanOrEqual(300);
    expect(Number.parseFloat(anchor.style.top)).toBeLessThanOrEqual(200);
    wrapper.unmount();
  });

  it('resizes without clearing settled dice', async () => {
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
    expect(mocks.diceBox.clear).not.toHaveBeenCalled();
    expect(mocks.diceBox.add).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
