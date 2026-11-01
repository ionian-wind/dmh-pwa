import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import TabPanel from '@/components/common/TabPanel.vue';
import TagChip from '@/components/common/TagChip.vue';
import FloatActionButton from '@/components/common/FloatActionButton.vue';
import PopoverPanel from '@/components/common/PopoverPanel.vue';
import RangeSlider from '@/components/common/RangeSlider.vue';
import Button from '@/components/form/Button.vue';
import RollButton from '@/components/RollButton.vue';
import { useModalState } from '@/composables/useModalState';

const mocks = vi.hoisted(() => ({
  diceBox: {
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    clear: vi.fn(),
  },
  DiceBox: vi.fn(),
}));

vi.mock('@3d-dice/dice-box', () => ({
  default: mocks.DiceBox.mockImplementation(() => mocks.diceBox),
}));

const QFabStub = defineComponent({
  name: 'QFab',
  props: {
    color: String,
    size: String,
    disable: Boolean,
    ripple: Boolean,
    fixed: Boolean,
    position: String,
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          class: 'q-fab-stub',
          'data-color': props.color,
          'data-size': props.size,
          'data-fixed': String(props.fixed),
          'data-position': props.position,
          onClick: (event: MouseEvent) => emit('click', event),
        },
        slots.default?.(),
      );
  },
});

const FloatActionButtonStub = defineComponent({
  name: 'FloatActionButton',
  props: { size: String, variant: String, style: [String, Object] },
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          class: 'fab-stub',
          style: props.style,
          'data-size': props.size,
          'data-variant': props.variant,
          onClick: () => emit('click'),
        },
        slots.default?.(),
      );
  },
});

describe('common controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.diceBox.init.mockResolvedValue(undefined);
  });

  it('TabPanel renders only when its tab is active', async () => {
    const activeTab = ref('one');
    const wrapper = mount(TabPanel, {
      props: { tabId: 'one' },
      slots: { default: 'Panel body' },
      global: { provide: { activeTab } },
    });

    expect(wrapper.text()).toContain('Panel body');

    activeTab.value = 'two';
    await nextTick();
    expect(wrapper.text()).toBe('');
  });

  it('TagChip renders content, optional icon and remove action', async () => {
    const wrapper = mount(TagChip, {
      props: { removable: true },
      slots: { default: 'Tag', icon: '<i class="custom-icon">x</i>' },
    });

    expect(wrapper.text()).toContain('Tag');
    expect(wrapper.find('.custom-icon').exists()).toBe(true);
    await wrapper.find('.remove-tag').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);

    const staticChip = mount(TagChip, { slots: { default: 'Static' } });
    expect(staticChip.find('.remove-tag').exists()).toBe(false);
  });

  it('FloatActionButton maps variants, positions and click events', async () => {
    const wrapper = mount(FloatActionButton, {
      props: {
        position: 'top-left',
        size: 'large',
        variant: 'success',
        disabled: true,
        ripple: false,
      },
      slots: { default: '!' },
      global: { stubs: { QFab: QFabStub } },
    });

    const fab = wrapper.findComponent(QFabStub);
    expect(fab.props()).toMatchObject({
      color: 'positive',
      size: 'lg',
      disable: true,
      ripple: false,
      fixed: true,
      position: 'top-left',
    });

    await wrapper.find('.q-fab-stub').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);

    const staticFab = mount(FloatActionButton, {
      props: { static: true, variant: 'danger' },
      global: { stubs: { QFab: QFabStub } },
    });
    expect(staticFab.findComponent(QFabStub).props()).toMatchObject({
      color: 'negative',
      size: 'md',
      fixed: false,
      position: undefined,
    });
  });

  it('FloatActionButton hides while a modal is open', () => {
    const modal = useModalState();
    modal.openModal('coverage-modal');

    const wrapper = mount(FloatActionButton, {
      global: { stubs: { QFab: QFabStub } },
    });
    expect(wrapper.findComponent(QFabStub).exists()).toBe(false);

    modal.closeModal('coverage-modal');
    wrapper.unmount();
  });

  it('PopoverPanel exposes open, close and toggle and reacts to isOpen', async () => {
    const wrapper = mount(PopoverPanel, {
      props: { isOpen: false },
      slots: {
        default: 'Popover body',
        trigger: '<button class="trigger">Open</button>',
      },
    });

    expect(wrapper.find('.trigger').exists()).toBe(true);
    expect(wrapper.text()).toContain('Popover body');

    wrapper.vm.open();
    await nextTick();
    expect(wrapper.emitted('open')).toHaveLength(1);

    wrapper.vm.close();
    await nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);

    wrapper.vm.toggle();
    await nextTick();
    expect(wrapper.emitted('open')?.length).toBe(2);

    await wrapper.setProps({ isOpen: true });
    await nextTick();
    await wrapper.setProps({ isOpen: false });
    await nextTick();
    expect(wrapper.emitted('close')?.length).toBeGreaterThan(1);

    const withoutTrigger = mount(PopoverPanel, {
      props: { isOpen: true, disableInternalTrigger: true },
      slots: { trigger: '<button class="trigger">Open</button>' },
    });
    expect(withoutTrigger.find('.trigger').exists()).toBe(false);
  });

  it('RangeSlider emits stepped horizontal and vertical values', async () => {
    const wrapper = mount(RangeSlider, {
      props: { modelValue: 0, min: 0, max: 100, step: 10 },
    });
    const container = wrapper.find('.slider-container')
      .element as HTMLElement;
    container.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    await wrapper.find('.slider-container').trigger('mousedown', {
      clientX: 54,
    });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([50]);

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 76 }));
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([80]);

    window.dispatchEvent(new MouseEvent('mouseup'));
    expect(wrapper.find('.track-fill').attributes('style')).toContain(
      'width: 0%',
    );

    const vertical = mount(RangeSlider, {
      props: {
        modelValue: 20,
        min: 0,
        max: 100,
        step: 1,
        vertical: true,
      },
    });
    const verticalContainer = vertical.find('.slider-container')
      .element as HTMLElement;
    verticalContainer.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    await vertical.find('.slider-container').trigger('touchstart', {
      touches: [{ clientY: 25 }],
    });
    expect(vertical.emitted('update:modelValue')?.[0]).toEqual([75]);
    expect(
      (vertical.find('.track-fill').element as HTMLElement).style.height,
    ).toBe('20%');
  });

  it('RangeSlider ignores interaction when disabled and supports zero range', async () => {
    const disabled = mount(RangeSlider, {
      props: { modelValue: 10, disabled: true },
    });
    await disabled.find('.slider-container').trigger('mousedown', {
      clientX: 50,
    });
    expect(disabled.emitted('update:modelValue')).toBeUndefined();
    expect(disabled.classes()).toContain('is-disabled');

    const zeroRange = mount(RangeSlider, {
      props: { modelValue: 5, min: 5, max: 5 },
    });
    expect(zeroRange.find('.thumb').attributes('style')).toContain('left: 0%');
    zeroRange.unmount();
    disabled.unmount();
  });

  it('Button emits clicks unless disabled or loading', async () => {
    const wrapper = mount(Button, {
      props: { variant: 'secondary', size: 'small' },
      slots: { default: 'Go' },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);

    const disabled = mount(Button, {
      props: { disabled: true },
      slots: { default: 'Go' },
    });
    await disabled.find('button').trigger('click');
    expect(disabled.emitted('click')).toBeUndefined();

    const loading = mount(Button, {
      props: { loading: true },
      slots: { default: 'Go' },
    });
    await loading.find('button').trigger('click');
    expect(loading.emitted('click')).toBeUndefined();
  });

  it('RollButton initializes dice, toggles fabs and rolls a die', async () => {
    const wrapper = mount(RollButton, {
      global: { stubs: { FloatActionButton: FloatActionButtonStub } },
    });
    await flushPromises();

    expect(mocks.DiceBox).toHaveBeenCalledWith(
      expect.objectContaining({ container: '#dice-roller' }),
    );
    expect(mocks.diceBox.init).toHaveBeenCalled();

    const buttons = wrapper.findAll('.fab-stub');
    expect(buttons).toHaveLength(9);

    await buttons[0].trigger('click');
    expect(buttons[1].attributes('data-size')).toBe('small');
    expect((buttons[1].element as HTMLElement).style.pointerEvents).toBe(
      'auto',
    );

    await buttons[1].trigger('click');
    expect(mocks.diceBox.add).toHaveBeenCalledWith('1d4');

    wrapper.unmount();
    expect(mocks.diceBox.clear).toHaveBeenCalled();
  });
});
