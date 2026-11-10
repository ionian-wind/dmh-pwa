import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StudioLayerSettings from '@/map-studio/components/StudioLayerSettings.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import { confirm } from '@/dialogs';
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
    vm.setShadow({ visible: true });
    vm.setHatching({ visible: true });
    vm.setShading({ visible: true });
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

  it('edits wall shadow, hatching and shading passes', async () => {
    const { store, pinia } = setup();
    const dungeon = store.map!.layers.find(
      (layer) => layer.type === 'dungeon',
    )!;
    store.setSettingsLayer(dungeon.id);
    const wrapper = mountSettings(pinia);
    const field = (text: string) =>
      wrapper
        .findAll('label')
        .filter((label) => label.find('span').text().trim() === text)
        .at(-1)!;
    const dungeonStyle = () => {
      const layer = store.settingsLayer;
      if (layer?.type !== 'dungeon') throw new Error('missing dungeon layer');
      return layer.style;
    };

    await field('Shadow').find('input[type="checkbox"]').setValue(true);
    expect(dungeonStyle().shadow.visible).toBe(true);
    await field('Shadow color').find('input[type="color"]').setValue('#101010');
    expect(dungeonStyle().shadow.color).toBe('#101010');
    await field('Shadow opacity').find('input[type="range"]').setValue('0.6');
    expect(dungeonStyle().shadow.opacity).toBe(0.6);
    await field('Offset X').find('input[type="number"]').setValue('0.25');
    expect(dungeonStyle().shadow.offsetX).toBe(0.25);
    await field('Offset Y').find('input[type="number"]').setValue('-0.15');
    expect(dungeonStyle().shadow.offsetY).toBe(-0.15);
    await field('Blend mode').findAll('select').at(-1)!.setValue('screen');
    expect(dungeonStyle().shadow.blendMode).toBe('screen');

    await field('Hatching').find('input[type="checkbox"]').setValue(true);
    expect(dungeonStyle().hatching.visible).toBe(true);
    await field('Pattern').find('select').setValue('cross');
    expect(dungeonStyle().hatching.variant).toBe('cross');
    await field('Hatch colour').find('input[type="color"]').setValue('#223344');
    expect(dungeonStyle().hatching.color).toBe('#223344');
    await field('Hatch size').find('input[type="number"]').setValue('0.7');
    expect(dungeonStyle().hatching.size).toBe(0.7);
    await field('Hatch width').find('input[type="number"]').setValue('0.02');
    expect(dungeonStyle().hatching.width).toBe(0.02);

    await field('Shading').find('input[type="checkbox"]').setValue(true);
    expect(dungeonStyle().shading.visible).toBe(true);
    await field('Shading colour')
      .find('input[type="color"]')
      .setValue('#334455');
    expect(dungeonStyle().shading.color).toBe('#334455');
    await field('Shading size').find('input[type="number"]').setValue('0.4');
    expect(dungeonStyle().shading.size).toBe(0.4);
    await field('Roughness').find('select').setValue('3');
    expect(dungeonStyle().shading.roughness).toBe(3);
    await field('Shading opacity').find('input[type="range"]').setValue('0.5');
    expect(dungeonStyle().shading.opacity).toBe(0.5);
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
    vi.mocked(confirm).mockResolvedValueOnce(false);
    await folderPanel.find('[title="Delete layer"]').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.map!.layers.some((layer) => layer.id === folder.id)).toBe(
      true,
    );
    vi.mocked(confirm).mockResolvedValueOnce(true);
    await folderPanel.find('[title="Delete layer"]').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.map!.layers.some((layer) => layer.id === folder.id)).toBe(
      false,
    );
    folderPanel.unmount();
  });
});
