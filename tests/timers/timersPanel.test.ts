import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

import TimersPanel from '@/timers/TimersPanel.vue';
import { useTimerStore } from '@/stores/timers';
import { confirm } from '@/dialogs';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));
vi.mock('@/dialogs', () => ({
  confirm: vi.fn().mockResolvedValue(true),
  alert: vi.fn().mockResolvedValue(undefined),
  prompt: vi.fn(),
}));

const DraggablePanelStub = defineComponent({
  name: 'DraggablePanel',
  props: { modelValue: Boolean, minWidth: String },
  emits: ['update:modelValue'],
  setup(_props, { slots }) {
    return () =>
      h('div', { 'data-stub': 'DraggablePanel' }, [
        slots.header?.(),
        slots.default?.(),
      ]);
  },
});

const TimerListItemStub = defineComponent({
  name: 'TimerListItem',
  props: { timer: { type: Object, required: true } },
  emits: ['edit', 'delete', 'start', 'stop', 'reset'],
  setup() {
    return () => h('div', { 'data-stub': 'TimerListItem' });
  },
});

const TimerEditorStub = defineComponent({
  name: 'TimerEditor',
  props: { timer: { type: Object, default: null }, isOpen: Boolean },
  emits: ['submit', 'delete', 'cancel'],
  setup() {
    return () => h('div', { 'data-stub': 'TimerEditor' });
  },
});

function mountPanel() {
  return mount(TimersPanel, {
    props: { modelValue: true },
    global: {
      stubs: {
        DraggablePanel: DraggablePanelStub,
        TimerListItem: TimerListItemStub,
        TimerEditor: TimerEditorStub,
      },
    },
  });
}

describe('TimersPanel', () => {
  beforeEach(() => {
    resetMockStores();
    vi.mocked(confirm).mockResolvedValue(true);
  });

  it('renders timers and creates one from the panel footer', async () => {
    seedMockStore('timers', [
      {
        id: 't1',
        title: 'Round',
        duration: 60,
        status: 'inactive',
        startedAt: null,
      },
    ]);
    const wrapper = mountPanel();
    await flushPromises();
    const store = useTimerStore();

    expect(wrapper.findAllComponents(TimerListItemStub)).toHaveLength(1);

    const create = wrapper
      .findAll('[data-stub="QItem"]')
      .find((item) => item.text().includes('Create Timer'))!;
    await create.trigger('click');
    const editor = wrapper.findComponent(TimerEditorStub);
    expect(editor.props('isOpen')).toBe(true);
    expect(editor.props('timer')).toBeNull();

    editor.vm.$emit('submit', { id: '', title: 'New timer', duration: 30 });
    await flushPromises();

    expect(store.items.map((timer) => timer.title)).toContain('New timer');
    expect(wrapper.findComponent(TimerEditorStub).props('isOpen')).toBe(false);
    wrapper.unmount();
  });

  it('edits, controls, and deletes timers', async () => {
    seedMockStore('timers', [
      {
        id: 't1',
        title: 'Round',
        duration: 60,
        status: 'inactive',
        startedAt: null,
      },
    ]);
    const wrapper = mountPanel();
    await flushPromises();
    const store = useTimerStore();
    vi.spyOn(store, 'start').mockResolvedValue(undefined);
    vi.spyOn(store, 'stop').mockResolvedValue(undefined);
    vi.spyOn(store, 'reset').mockResolvedValue(undefined);
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);

    const item = wrapper.findComponent(TimerListItemStub);
    item.vm.$emit('start');
    item.vm.$emit('stop');
    item.vm.$emit('reset');
    expect(store.start).toHaveBeenCalledWith('t1');
    expect(store.stop).toHaveBeenCalledWith('t1');
    expect(store.reset).toHaveBeenCalledWith('t1');

    item.vm.$emit('edit');
    await flushPromises();
    expect(wrapper.findComponent(TimerEditorStub).props('timer')).toMatchObject(
      {
        id: 't1',
      },
    );

    item.vm.$emit('delete');
    await flushPromises();
    expect(store.remove).toHaveBeenCalledWith('t1');
    wrapper.unmount();
  });

  it('deletes through the editor and ignores unknown ids', async () => {
    seedMockStore('timers', [
      {
        id: 't1',
        title: 'Round',
        duration: 60,
        status: 'inactive',
        startedAt: null,
      },
    ]);
    const wrapper = mountPanel();
    await flushPromises();
    const store = useTimerStore();
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);

    await wrapper
      .findAll('[data-stub="QItem"]')
      .find((entry) => entry.text().includes('Create Timer'))!
      .trigger('click');
    const editor = wrapper.findComponent(TimerEditorStub);

    editor.vm.$emit('delete', 'missing');
    await flushPromises();
    expect(store.remove).not.toHaveBeenCalled();
    expect(wrapper.findComponent(TimerEditorStub).props('isOpen')).toBe(true);

    editor.vm.$emit('delete', 't1');
    await flushPromises();
    expect(store.remove).toHaveBeenCalledWith('t1');
    expect(wrapper.findComponent(TimerEditorStub).props('isOpen')).toBe(false);
    wrapper.unmount();
  });

  it('closes from its header', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper.find('button[aria-label="Close"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    wrapper.unmount();
  });
});
