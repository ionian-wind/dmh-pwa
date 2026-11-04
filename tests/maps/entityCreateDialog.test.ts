import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import EntityCreateDialog from '@/maps/components/EntityCreateDialog.vue';

const mocks = vi.hoisted(() => ({
  createLinkedEntity: vi.fn(),
  alert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/maps/utils/createLinkedEntity', () => ({
  createLinkedEntity: mocks.createLinkedEntity,
}));

vi.mock('@/dialogs', () => ({ alert: mocks.alert }));

describe('EntityCreateDialog', () => {
  it('creates an entity, guards duplicates and emits its ref', async () => {
    let resolveCreate: (value: any) => void = () => {};
    mocks.createLinkedEntity.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const wrapper = mount(EntityCreateDialog, {
      props: { kind: 'note' },
      global: { stubs: { NoteEditor: true } },
    });
    const vm = wrapper.vm as any;

    const first = vm.handleSubmit({ title: 'New note' });
    const second = vm.handleSubmit({ title: 'Second note' });
    await second;
    expect(mocks.createLinkedEntity).toHaveBeenCalledTimes(1);
    resolveCreate({ id: 'n1', label: 'New note' });
    await first;
    expect(wrapper.emitted('created')?.[0]).toEqual([
      { ref: { kind: 'note', id: 'n1' }, label: 'New note' },
    ]);
    wrapper.unmount();
  });

  it('handles creation errors and cancellation', async () => {
    mocks.createLinkedEntity.mockRejectedValueOnce(new Error('bad'));
    const wrapper = mount(EntityCreateDialog, {
      props: { kind: 'note' },
      global: { stubs: { NoteEditor: true } },
    });
    const vm = wrapper.vm as any;
    await vm.handleSubmit({ title: 'New note' });
    await flushPromises();
    expect(mocks.alert).toHaveBeenCalled();

    vm.handleCancel();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    vm.handleModelUpdate(false);
    expect(wrapper.emitted('cancel')).toHaveLength(2);
    vm.handleModelUpdate(true);
    expect(wrapper.emitted('cancel')).toHaveLength(2);
    wrapper.unmount();
  });

  it('provides editor props for every entity kind', async () => {
    for (const kind of [
      'note',
      'module',
      'party',
      'monster',
      'encounter',
      'character',
      'map',
      'location',
      'playlist',
    ] as const) {
      const wrapper = mount(EntityCreateDialog, {
        props: { kind },
        global: { stubs: { NoteEditor: true } },
      });
      await flushPromises();
      expect(wrapper.exists()).toBe(true);
      wrapper.unmount();
    }
  });
});
