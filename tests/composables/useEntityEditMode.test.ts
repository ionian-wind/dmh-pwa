import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  confirmUnsavedChanges: vi.fn(),
  leaveHandler: null as null | (() => any),
}));

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: (handler: () => any) => {
    mocks.leaveHandler = handler;
  },
}));

vi.mock('@/dialogs/unsavedChanges', () => ({
  confirmUnsavedChanges: mocks.confirmUnsavedChanges,
}));

import { useEntityEditMode } from '@/composables/useEntityEditMode';

interface Entity {
  id: string;
  name: string;
}

function createHarness(
  source: Ref<Entity | null>,
  overrides: Record<string, any> = {},
) {
  let api: any;
  const save = vi.fn().mockResolvedValue(true);
  const prepare = vi.fn().mockResolvedValue(true);
  const onDiscard = vi.fn();

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useEntityEditMode<Entity>({
          source,
          clone: (entity) => ({ ...entity }),
          save,
          prepare,
          onDiscard,
          ...overrides,
        });
        return () => h('div');
      },
    }),
  );

  return { wrapper, api, save, prepare, onDiscard };
}

describe('useEntityEditMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.leaveHandler = null;
  });

  it('starts in view mode and enters edit with a clone', async () => {
    const source = ref<Entity | null>({ id: '1', name: 'Original' });
    const { wrapper, api } = createHarness(source);

    expect(api.editState.isEditMode).toBe(false);
    await api.setEditMode(true);
    expect(api.editState.isEditMode).toBe(true);
    expect(api.editState.draft).toEqual({ id: '1', name: 'Original' });
    expect(api.editState.draft).not.toBe(source.value);

    api.editState.draft.name = 'Changed';
    expect(source.value?.name).toBe('Original');
    wrapper.unmount();
  });

  it('saves dirty drafts and exits edit mode', async () => {
    const source = ref<Entity | null>({ id: '1', name: 'Original' });
    const { wrapper, api, save } = createHarness(source);

    await api.setEditMode(true);
    api.editState.draft.name = 'Changed';
    expect(api.isDirty.value).toBe(true);

    await api.setEditMode(false);
    expect(save).toHaveBeenCalledWith({
      id: '1',
      name: 'Changed',
    });
    expect(api.editState.isEditMode).toBe(false);
    expect(api.editState.draft).toBeNull();
    wrapper.unmount();
  });

  it('discards clean drafts without saving', async () => {
    const source = ref<Entity | null>({ id: '1', name: 'Original' });
    const { wrapper, api, save } = createHarness(source);

    await api.setEditMode(true);
    await api.setEditMode(false);

    expect(save).not.toHaveBeenCalled();
    expect(api.editState.isEditMode).toBe(false);
    wrapper.unmount();
  });

  it('keeps edit mode when prepare or save fails', async () => {
    const source = ref<Entity | null>({ id: '1', name: 'Original' });
    const { wrapper, api, prepare, save } = createHarness(source);
    await api.setEditMode(true);
    api.editState.draft.name = 'Changed';

    prepare.mockResolvedValueOnce(false);
    await api.setEditMode(false);
    expect(prepare).toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(api.editState.isEditMode).toBe(true);

    save.mockResolvedValueOnce(false);
    await api.setEditMode(false);
    expect(api.editState.isEditMode).toBe(true);
    wrapper.unmount();
  });

  it('supports extra dirty state', async () => {
    const source = ref<Entity | null>({ id: '1', name: 'Original' });
    const extraDirty = ref(true);
    const { wrapper, api } = createHarness(source, {
      extraDirty: () => extraDirty.value,
    });

    await api.setEditMode(true);
    expect(api.isDirty.value).toBe(true);
    extraDirty.value = false;
    await nextTick();
    expect(api.isDirty.value).toBe(false);
    wrapper.unmount();
  });

  it('handles cancel, discard and save in the leave guard', async () => {
    const source = ref<Entity | null>({ id: '1', name: 'Original' });
    const { wrapper, api, save } = createHarness(source);
    await api.setEditMode(true);
    api.editState.draft.name = 'Changed';

    mocks.confirmUnsavedChanges.mockResolvedValueOnce('cancel');
    await expect(mocks.leaveHandler!()).resolves.toBe(false);
    expect(api.editState.isEditMode).toBe(true);

    mocks.confirmUnsavedChanges.mockResolvedValueOnce('discard');
    await expect(mocks.leaveHandler!()).resolves.toBe(true);
    expect(api.editState.isEditMode).toBe(false);

    await api.setEditMode(true);
    api.editState.draft.name = 'Changed again';
    mocks.confirmUnsavedChanges.mockResolvedValueOnce('save');
    await expect(mocks.leaveHandler!()).resolves.toBe(true);
    expect(save).toHaveBeenCalled();
    expect(api.editState.isEditMode).toBe(false);
    wrapper.unmount();
  });

  it('allows navigation when there are no changes', async () => {
    const source = ref<Entity | null>({ id: '1', name: 'Original' });
    const { wrapper } = createHarness(source);

    mocks.confirmUnsavedChanges.mockClear();
    await expect(mocks.leaveHandler!()).resolves.toBe(true);
    expect(mocks.confirmUnsavedChanges).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('discards when the source disappears', async () => {
    const source = ref<Entity | null>({ id: '1', name: 'Original' });
    const { wrapper, api, onDiscard } = createHarness(source);
    await api.setEditMode(true);
    source.value = null;

    await expect(api.saveDraft()).resolves.toBe(true);
    expect(api.editState.isEditMode).toBe(false);
    expect(onDiscard).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ignores enter when there is no source', async () => {
    const source = ref<Entity | null>(null);
    const { wrapper, api } = createHarness(source);

    await api.setEditMode(true);
    expect(api.editState.isEditMode).toBe(false);
    wrapper.unmount();
  });

  it('handles the beforeunload guard only when dirty', async () => {
    const source = ref<Entity | null>({ id: '1', name: 'Original' });
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { wrapper, api } = createHarness(source);

    const handler = add.mock.calls.find(
      ([event]) => event === 'beforeunload',
    )?.[1] as EventListener;

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    handler(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    await api.setEditMode(true);
    api.editState.draft.name = 'Changed';
    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    handler(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);

    wrapper.unmount();
    expect(remove).toHaveBeenCalledWith('beforeunload', handler);
  });
});
