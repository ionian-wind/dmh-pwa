import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

const storeMock = vi.hoisted(() => ({
  loading: false,
  storedPacks: [{ id: 'pack-1', name: 'Campaign' }],
  allScenes: [] as any[],
  loadStoredPacks: vi.fn().mockResolvedValue(undefined),
  stopPreview: vi.fn(),
  importPack: vi.fn().mockResolvedValue(undefined),
}));

const layoutMock = vi.hoisted(() => ({
  setTopMenuContent: vi.fn(),
}));

const rightDrawerMock = vi.hoisted(() => ({
  set: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('@/composables/useLayout', () => ({
  useLayout: () => ({
    setTopMenuContent: layoutMock.setTopMenuContent,
  }),
  useRightDrawer: () => rightDrawerMock,
}));

import AmbientSoundView from '@/ambient-sound/AmbientSoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import { EntityTabsStub } from '../helpers/entityTabsStub';

const ScenePlayerDialogStub = defineComponent({
  name: 'ScenePlayerDialog',
  props: { modelValue: Boolean, packId: String, sceneId: String },
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue" class="scene-dialog-stub" />',
});

const stubs = {
  QSpinnerDots: true,
  SceneList: true,
  AmbienceGallery: true,
  OneShotGallery: true,
  ScenePlayerDialog: ScenePlayerDialogStub,
  EntityTabs: EntityTabsStub,
};

describe('AmbientSoundView', () => {
  beforeEach(() => {
    storeMock.loading = false;
    storeMock.storedPacks = [{ id: 'pack-1', name: 'Campaign' }] as any;
    storeMock.allScenes = [
      {
        pack: { id: 'pack-1', name: 'Forest' },
        scene: { id: 'scene-1', name: 'Tavern Evening' },
      },
    ] as any;
    for (const fn of [
      storeMock.loadStoredPacks,
      storeMock.stopPreview,
      storeMock.importPack,
      layoutMock.setTopMenuContent,
      rightDrawerMock.set,
      rightDrawerMock.clear,
    ]) {
      fn.mockClear();
    }
  });

  it('renders the scene/gallery tabs and playback controls', async () => {
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    const header = layoutMock.setTopMenuContent.mock.calls[0][0];
    expect(header.component).toBe(ViewHeader);
    expect(header.props?.title).toBeUndefined();
    expect(rightDrawerMock.set).toHaveBeenCalledWith({
      component: SoundPackSidebar,
    });
    expect(wrapper.text()).toContain('Scenes');
    expect(wrapper.text()).toContain('Ambiences');
    expect(wrapper.text()).toContain('One-shots');
    expect(wrapper.findComponent({ name: 'SceneList' }).exists()).toBe(true);

    wrapper.unmount();
    expect(layoutMock.setTopMenuContent).toHaveBeenLastCalledWith(null);
    expect(rightDrawerMock.clear).toHaveBeenCalled();
    expect(storeMock.stopPreview).toHaveBeenCalled();
  });

  it('switches tabs between scenes and the global galleries', async () => {
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    const ambiencesTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Ambiences');
    await ambiencesTab!.trigger('click');
    expect(wrapper.findComponent({ name: 'AmbienceGallery' }).exists()).toBe(
      true,
    );

    const oneShotTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'One-shots');
    await oneShotTab!.trigger('click');
    expect(wrapper.findComponent({ name: 'OneShotGallery' }).exists()).toBe(
      true,
    );
    wrapper.unmount();
  });

  it('opens the scene dialog with the selected scene', async () => {
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    wrapper
      .findComponent({ name: 'SceneList' })
      .vm.$emit('open', 'pack-1', 'scene-1');
    await flushPromises();

    const dialog = wrapper.findComponent(ScenePlayerDialogStub);
    expect(dialog.props('modelValue')).toBe(true);
    expect(dialog.props('packId')).toBe('pack-1');
    expect(dialog.props('sceneId')).toBe('scene-1');

    dialog.vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(dialog.props('modelValue')).toBe(false);
    wrapper.unmount();
  });

  it('shows the empty import state without packages', async () => {
    storeMock.storedPacks = [] as any;
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('Import Pack');
    expect(wrapper.text()).toContain('Import a package');
    expect(wrapper.findComponent({ name: 'SceneList' }).exists()).toBe(false);
    wrapper.unmount();
  });

  it('imports a sound pack from the empty state', async () => {
    storeMock.storedPacks = [] as any;
    const click = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    const importButton = wrapper.find('.empty-state-import');
    expect(importButton.text()).toContain('Import');
    await importButton.trigger('click');
    expect(click).toHaveBeenCalled();

    const fileInput = wrapper.find('input[type=file]');
    const file = new File(['pack'], 'pack.spk');
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [file],
    });
    await fileInput.trigger('change');
    await flushPromises();

    expect(storeMock.importPack).toHaveBeenCalledWith(file);
    click.mockRestore();
    wrapper.unmount();
  });

  it('shows loading through the shared spinner state', () => {
    storeMock.loading = true;
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    expect(wrapper.text()).toContain('Loading sound pack...');
    wrapper.unmount();
  });
});
