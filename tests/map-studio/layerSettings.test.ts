import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StudioLayerSettings from '@/map-studio/components/StudioLayerSettings.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';

vi.mock('@/dialogs', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn().mockResolvedValue(true),
  prompt: vi.fn().mockResolvedValue('Renamed'),
}));

function setup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useMapStudioStore();
  store.setMap(createMap(createProject().id));
  return { store, pinia };
}

function mountSettings(pinia: ReturnType<typeof createPinia>) {
  return mount(StudioLayerSettings, {
    global: { plugins: [pinia] },
  });
}

describe('StudioLayerSettings', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders nothing without a layer', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMapStudioStore();
    const wrapper = mountSettings(pinia);
    expect(wrapper.text()).toBe('');
    const vm = wrapper.vm as any;
    await vm.renameLayer();
    await vm.deleteLayer();
    vm.setFloorColor({ target: { value: '#fff' } });
    vm.setWallColor({ target: { value: '#fff' } });
    vm.setWallWidth({ target: { value: '1' } });
    vm.setWallGridColor({ target: { value: '#fff' } });
    vm.setWallGridWidth({ target: { value: '1' } });
    vm.toggleLayerGrid();
    vm.toggleBlocksLight();
    vm.setParent({ target: { value: '' } });
    store.setMap(createMap(createProject().id));
    wrapper.unmount();
  });

  it('edits dungeon wall, grid and blend settings', async () => {
    const { store, pinia } = setup();
    const wrapper = mountSettings(pinia);
    expect(wrapper.text()).toContain('Layer settings');
    const selects = wrapper.findAll('select');
    await selects[0].setValue('multiply');
    expect(store.settingsLayer?.blendMode).toBe('multiply');
    const ranges = wrapper.findAll('input[type="range"]');
    await ranges[0].setValue('0.5');
    expect(store.settingsLayer?.opacity).toBe(0.5);
    const colors = wrapper.findAll('input[type="color"]');
    await colors[0].setValue('#123123');
    expect(
      store.settingsLayer?.type === 'dungeon' &&
        store.settingsLayer.style.floor.color,
    ).toBe('#123123');
    await colors[1].setValue('#321321');
    expect(
      store.settingsLayer?.type === 'dungeon' &&
        store.settingsLayer.style.walls.color,
    ).toBe('#321321');
    const numbers = wrapper.findAll('input[type="number"]');
    await numbers[0].setValue('0.2');
    expect(
      store.settingsLayer?.type === 'dungeon' &&
        store.settingsLayer.style.walls.width,
    ).toBe(0.2);
    const checks = wrapper.findAll('input[type="checkbox"]');
    await checks[0].setValue(false);
    expect(
      store.settingsLayer?.type === 'dungeon' &&
        store.settingsLayer.style.walls.blocksLight,
    ).toBe(false);
    await checks[1].setValue(false);
    expect(
      store.settingsLayer?.type === 'dungeon' &&
        store.settingsLayer.style.grid.visible,
    ).toBe(false);
    await colors[2].setValue('#654321');
    expect(
      store.settingsLayer?.type === 'dungeon' &&
        store.settingsLayer.style.grid.color,
    ).toBe('#654321');
    await numbers[1].setValue('2');
    expect(
      store.settingsLayer?.type === 'dungeon' &&
        store.settingsLayer.style.grid.width,
    ).toBe(2);
    await wrapper.find('[title="Rename layer"]').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.settingsLayer?.name).toBe('Renamed');
    wrapper.unmount();
  });

  it('edits background colour, opacity, grid and isometric settings', async () => {
    const { store, pinia } = setup();
    const background = store.map!.layers.find(
      (layer) => layer.type === 'background',
    )!;
    store.setSettingsLayer(background.id);
    const wrapper = mountSettings(pinia);
    const ranges = wrapper.findAll('input[type="range"]');
    await ranges[0].setValue('0.4');
    expect(store.map?.background.style.opacity).toBe(0.4);
    const colors = wrapper.findAll('input[type="color"]');
    await colors[0].setValue('#abcdef');
    expect(store.map?.background.style.color).toBe('#abcdef');
    await colors[1].setValue('#112233');
    expect(store.map?.grid.color).toBe('#112233');
    const numbers = wrapper.findAll('input[type="number"]');
    await numbers[0].setValue('3');
    expect(store.map?.grid.width).toBe(3);
    wrapper.unmount();
  });

  it('moves a dungeon layer into a folder from layer settings', async () => {
    const { store, pinia } = setup();
    store.addFolder('Folder');
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    const dungeon = store.map!.layers.find(
      (layer) => layer.type === 'dungeon',
    )!;
    store.setSettingsLayer(dungeon.id);
    const wrapper = mountSettings(pinia);
    const folderSelect = wrapper
      .findAll('select')
      .find((select) => select.findAll('option').length > 1)!;
    await folderSelect.setValue(folder.id);
    expect(store.settingsLayer?.parentId).toBe(folder.id);
    wrapper.unmount();
  });

  it('does not show delete for protected layers', () => {
    const { store, pinia } = setup();
    const background = store.map!.layers.find(
      (layer) => layer.type === 'background',
    )!;
    store.setSettingsLayer(background.id);
    const wrapper = mountSettings(pinia);
    expect(wrapper.find('[title="Delete layer"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows images and folder settings', async () => {
    const { store, pinia } = setup();
    store.addText('A', [1, 1]);
    const images = store.map!.layers.find((layer) => layer.type === 'images')!;
    store.setSettingsLayer(images.id);
    const imagesPanel = mountSettings(pinia);
    expect(imagesPanel.text()).toContain('1 objects');
    imagesPanel.unmount();

    store.addFolder('Folder');
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    store.setSettingsLayer(folder.id);
    const folderPanel = mountSettings(pinia);
    expect(folderPanel.text()).toContain('Folder');
    expect(folderPanel.text()).toContain('Layer settings');
    await folderPanel.find('[title="Delete layer"]').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.map!.layers.some((layer) => layer.id === folder.id)).toBe(
      false,
    );
    folderPanel.unmount();
  });
});
