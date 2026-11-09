import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => {
  const diceBox = {
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    roll: vi.fn(),
    clear: vi.fn(),
    pick: vi.fn(() => null),
    debugScene: vi.fn(() => []),
    beginDrag: vi.fn(() => false),
    dragTo: vi.fn(),
    endDrag: vi.fn(),
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
  methods: { updatePosition() {} },
  template: '<div class="q-menu-stub"><slot /></div>',
});
const QBtnStub = defineComponent({
  name: 'QBtn',
  props: {
    label: { type: String, default: '' },
    disable: { type: Boolean, default: false },
  },
  emits: ['click'],
  template:
    '<button :disabled="disable" @click="$emit(\'click\')">{{ label }}<slot /></button>',
});

function mountPanel() {
  document
    .querySelectorAll(
      '#dice-roller-surface, .floating-panel-anchor, .dice-roller-menu',
    )
    .forEach((element) => element.remove());
  return mount(DiceRollerPanel, {
    attachTo: document.body,
    props: { modelValue: true },
    global: {
      components: { QBtn: QBtnStub },
      stubs: { teleport: false, QMenu: QMenuStub },
    },
  });
}

function cell(label: string, count: number): HTMLElement {
  const row = Array.from(
    document.querySelectorAll<HTMLElement>('.dice-roller-grid-row'),
  ).find(
    (element) =>
      element.querySelector('.dice-roller-row-label')?.textContent?.trim() ===
      label,
  );
  const button =
    row?.querySelectorAll<HTMLElement>('.dice-roller-cell')[count - 2];
  if (!button) throw new Error(`missing cell ${label} x${count}`);
  return button;
}

function rowButton(label: string): HTMLElement {
  const row = Array.from(
    document.querySelectorAll<HTMLElement>('.dice-roller-grid-row'),
  ).find(
    (element) =>
      element.querySelector('.dice-roller-row-label')?.textContent?.trim() ===
      label,
  );
  const button = row?.querySelector<HTMLElement>('.dice-roller-row-label');
  if (!button) throw new Error(`missing row ${label}`);
  return button;
}

describe('DiceRollerPanel', () => {
  beforeAll(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      null as never,
    );
  });

  beforeEach(() => {
    for (const mock of Object.values(mocks.diceBox)) {
      mock.mockClear();
    }
    mocks.diceBox.init.mockResolvedValue(undefined);
    mocks.DiceBox.mockClear();
  });

  it('initializes the dice surface and rolls grid selections', async () => {
    const wrapper = mountPanel();
    await flushPromises();
    await vi.waitFor(() => expect(mocks.DiceBox).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(cell('d6', 2).hasAttribute('disabled')).toBe(false),
    );

    expect(mocks.DiceBox).toHaveBeenCalledWith(
      expect.objectContaining({
        container: '#dice-roller-surface',
        assetPath: '/dmh-pwa/assets/dice-box/',
        offscreen: false,
      }),
    );
    expect(mocks.diceBox.init).toHaveBeenCalled();
    expect(
      document.querySelector('.dice-roller-mode')?.getAttribute('title'),
    ).toContain('Exploding');

    cell('d6', 2).click();
    expect(mocks.diceBox.add.mock.calls).toEqual([['1d6'], ['1d6']]);

    mocks.diceBox.add.mockClear();
    rowButton('d100').click();
    expect(mocks.diceBox.add).toHaveBeenCalledWith('2d10');

    wrapper.unmount();
  });

  it('rerolls the last grid selection and clears the tray', async () => {
    const wrapper = mountPanel();
    await flushPromises();
    await vi.waitFor(() => expect(mocks.diceBox.init).toHaveBeenCalled());

    await vi.waitFor(() =>
      expect(cell('d6', 2).hasAttribute('disabled')).toBe(false),
    );
    cell('d6', 2).click();
    await nextTick();
    mocks.diceBox.add.mockClear();
    (
      document.querySelector('.dice-roller-footer-button') as HTMLElement
    ).click();
    expect(mocks.diceBox.clear).toHaveBeenCalled();
    expect(mocks.diceBox.add.mock.calls).toEqual([['1d6'], ['1d6']]);

    mocks.diceBox.add.mockClear();
    const clear = document.querySelectorAll<HTMLElement>(
      '.dice-roller-footer-button',
    )[1];
    clear.click();
    expect(mocks.diceBox.clear).toHaveBeenCalledTimes(2);
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

    const anchor = document.querySelector<HTMLElement>(
      '.floating-panel-anchor',
    )!;
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
