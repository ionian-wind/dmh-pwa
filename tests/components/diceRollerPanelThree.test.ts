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
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const diceBox = {
    kind: 'dicebox',
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    replace: vi.fn(),
    clear: vi.fn(),
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

const global = {
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
    mocks.three.resize.mockReset();
    mocks.three.dispose.mockReset();
    mocks.diceBox.init.mockReset().mockResolvedValue(undefined);
    mocks.failThreeInit.value = false;
  });

  it('uses add, replace, clear and resize through the adapter', async () => {
    const wrapper = mountPanel();
    await flushPromises();
    expect(mocks.ThreeDiceRenderer).toHaveBeenCalled();
    expect(mocks.three.init).toHaveBeenCalled();

    button('d6').click();
    await flushPromises();
    expect(mocks.three.add).toHaveBeenCalledTimes(1);
    expect(mocks.three.add.mock.calls[0][0][0]).toMatchObject({
      sides: 6,
    });

    button('d100').click();
    await flushPromises();
    expect(mocks.three.add).toHaveBeenCalledTimes(2);

    button('Reroll').click();
    await flushPromises();
    expect(mocks.three.replace).toHaveBeenCalledTimes(1);
    expect(mocks.three.replace.mock.calls[0][0]).toHaveLength(2);

    button('Clear').click();
    expect(mocks.three.clear).toHaveBeenCalled();

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

  it('falls back to DiceBox when the Three renderer cannot start', async () => {
    mocks.three.init.mockRejectedValue(new Error('no webgl'));
    const wrapper = mountPanel();
    await flushPromises();
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
    button('d6').click();
    await flushPromises();
    expect(document.querySelector('.dice-roller-error')).not.toBeNull();
    expect(button('d6').textContent).toContain('×1');
    wrapper.unmount();
  });
});
