import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => {
  const three = {
    kind: 'three',
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    replace: vi.fn(),
    clear: vi.fn(),
    pick: vi.fn(() => null),
    debugScene: vi.fn(() => []),
    beginDrag: vi.fn(() => false),
    dragTo: vi.fn(),
    endDrag: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const diceBox = {
    kind: 'dicebox',
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    replace: vi.fn(),
    clear: vi.fn(),
    pick: vi.fn(() => null),
    debugScene: vi.fn(() => []),
    beginDrag: vi.fn(() => false),
    dragTo: vi.fn(),
    endDrag: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  return {
    three,
    diceBox,
    ThreeDiceRenderer: vi.fn(function () {
      return three;
    }),
    DiceBoxRenderer: vi.fn(function () {
      return diceBox;
    }),
    failThreeInit: { value: false },
  };
});

vi.mock('@/features/dice-roller/renderer/DiceRenderer', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/dice-roller/renderer/DiceRenderer')
  >('@/features/dice-roller/renderer/DiceRenderer');
  return { ...actual, supportsWebGL: () => true };
});

vi.mock('@/features/dice-roller/renderer/ThreeDiceRenderer', () => ({
  ThreeDiceRenderer: mocks.ThreeDiceRenderer,
}));

vi.mock('@/features/dice-roller/renderer/DiceBoxRenderer', () => ({
  DiceBoxRenderer: mocks.DiceBoxRenderer,
}));

import DiceRollerPanel from '@/components/DiceRollerPanel.vue';

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

const global = {
  components: { QBtn: QBtnStub },
  stubs: {
    teleport: false,
    QMenu: defineComponent({
      name: 'QMenu',
      props: { modelValue: { type: Boolean, default: false } },
      emits: ['update:modelValue'],
      methods: {
        updatePosition() {},
      },
      template: '<div class="q-menu-stub"><slot /></div>',
    }),
  },
};

function mountPanel() {
  document
    .querySelectorAll(
      '#dice-roller-surface, .dice-roller-anchor, .dice-roller-menu',
    )
    .forEach((element) => element.remove());
  return mount(DiceRollerPanel, {
    attachTo: document.body,
    props: { modelValue: true },
    global,
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

describe('DiceRollerPanel with the Three renderer', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      if (mock && typeof mock === 'object' && 'mockClear' in mock) {
        (mock as { mockClear: () => void }).mockClear();
      }
    }
    mocks.three.init.mockReset().mockResolvedValue(undefined);
    mocks.three.add.mockReset();
    mocks.three.replace.mockReset();
    mocks.three.clear.mockReset();
    mocks.three.pick.mockReset().mockReturnValue(null);
    mocks.three.beginDrag.mockReset().mockReturnValue(false);
    mocks.three.dragTo.mockReset();
    mocks.three.endDrag.mockReset();
    mocks.three.resize.mockReset();
    mocks.three.dispose.mockReset();
    mocks.diceBox.init.mockReset().mockResolvedValue(undefined);
    mocks.failThreeInit.value = false;
  });

  it('adds grid selections to the pool and resizes', async () => {
    const wrapper = mountPanel();
    await flushPromises();
    await vi.waitFor(() => expect(mocks.three.init).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(cell('d6', 2).hasAttribute('disabled')).toBe(false),
    );

    cell('d6', 2).click();
    expect(mocks.three.add).toHaveBeenCalledTimes(1);
    expect(mocks.three.add.mock.calls[0][0]).toHaveLength(2);
    expect(mocks.three.add.mock.calls[0][0][0]).toMatchObject({ sides: 6 });

    cell('d100', 3).click();
    await nextTick();
    expect(mocks.three.add).toHaveBeenCalledTimes(2);
    expect(mocks.three.add.mock.calls[1][0]).toHaveLength(3);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    });
    window.dispatchEvent(new Event('resize'));
    expect(mocks.three.resize).toHaveBeenCalledWith(900, 600);

    wrapper.unmount();
    expect(mocks.three.dispose).toHaveBeenCalled();
  });

  it('emits individual and pool events in the unified format', async () => {
    const wrapper = mountPanel();
    await flushPromises();
    await vi.waitFor(() => expect(mocks.three.init).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(cell('d6', 2).hasAttribute('disabled')).toBe(false),
    );
    cell('d6', 2).click();

    const options = mocks.three.init.mock.calls[0][1] as {
      onSettled: (results: unknown[]) => void;
    };
    options.onSettled([
      { id: 'a', sides: 6, value: 3, label: 'd6', notation: '1d6' },
      { id: 'b', sides: 6, value: 4, label: 'd6', notation: '1d6' },
    ]);
    await nextTick();

    const events = (wrapper.emitted('roll') ?? []).map(
      (entry) => entry[0] as Record<string, unknown>,
    );
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ pool: false, total: 3 });
    expect(events[1]).toMatchObject({ pool: false, total: 4 });
    expect(events[2]).toMatchObject({
      pool: true,
      total: 7,
      process: expect.objectContaining({ raw: '2d6' }),
    });
    wrapper.unmount();
  });

  it('handles mixed explosion modes and FUDGE pool metadata', async () => {
    const wrapper = mountPanel();
    await flushPromises();
    await vi.waitFor(() => expect(mocks.three.init).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(cell('d6', 2).hasAttribute('disabled')).toBe(false),
    );
    const fudge = Array.from(
      document.querySelectorAll<HTMLElement>('.dice-roller-grid-row'),
    ).find(
      (row) =>
        row.querySelector('.dice-roller-row-label')?.textContent?.trim() ===
        'FUDGE',
    );
    fudge!.querySelector<HTMLElement>('.dice-roller-row-label')!.click();

    const options = mocks.three.init.mock.calls[0][1] as {
      onSettled: (results: unknown[]) => void;
    };
    options.onSettled([
      { id: 'a', sides: 6, value: 6, label: 'd6', explode: '!' },
      {
        id: 'b',
        sides: 3,
        kind: 'fate',
        value: 0,
        label: 'FUDGE',
      },
      {
        id: 'c',
        sides: 6,
        value: 2,
        label: 'd6',
        explode: '!',
        isExtra: true,
        penalty: 1,
        rootId: 'a',
      },
    ]);
    await nextTick();
    options.onSettled([]);
    await nextTick();

    const events = (wrapper.emitted('roll') ?? []).map(
      (entry) => entry[0] as Record<string, unknown>,
    );
    expect(events).toHaveLength(4);
    expect(events[3]).toMatchObject({ pool: true });
    expect((events[3] as { mode?: string }).mode).toBeUndefined();
    expect((events[3] as { process: { raw: string } }).process.raw).toContain(
      '1dF',
    );
    wrapper.unmount();
  });

  it('toggles modes, ignores empty reroll and handles stray pointers', async () => {
    const wrapper = mountPanel();
    await flushPromises();
    await vi.waitFor(() => expect(mocks.three.init).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(cell('d6', 2).hasAttribute('disabled')).toBe(false),
    );

    const modeButton =
      document.querySelector<HTMLElement>('.dice-roller-mode')!;
    modeButton.click();
    await nextTick();
    expect(modeButton.classList.contains('active')).toBe(true);
    modeButton.click();
    await nextTick();
    expect(modeButton.classList.contains('active')).toBe(false);

    const footer = document.querySelectorAll<HTMLElement>(
      '.dice-roller-footer-button',
    );
    footer[0].click();
    footer[1].click();
    window.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 2 }),
    );
    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0 }),
    );
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 10,
        clientY: 10,
      }),
    );
    await nextTick();
    wrapper.unmount();
  });

  it('falls back to DiceBox when the Three renderer cannot start', async () => {
    mocks.three.init.mockRejectedValue(new Error('no webgl'));
    const wrapper = mountPanel();
    await flushPromises();
    await vi.waitFor(() => expect(mocks.three.init).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(
        document.querySelector('.dice-roller-cell')?.hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(mocks.three.dispose).toHaveBeenCalled();
    expect(mocks.diceBox.init).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps the pool visible when renderer.add throws', async () => {
    mocks.three.add.mockImplementation(() => {
      throw new Error('render failed');
    });
    const wrapper = mountPanel();
    await flushPromises();
    await vi.waitFor(() => expect(mocks.three.init).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(
        document.querySelector('.dice-roller-cell')?.hasAttribute('disabled'),
      ).toBe(false),
    );
    cell('d6', 2).click();
    await flushPromises();
    expect(document.querySelector('.dice-roller-error')).not.toBeNull();
    wrapper.unmount();
  });
});
