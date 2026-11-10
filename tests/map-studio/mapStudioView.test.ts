import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
  prompt: vi.fn(),
  confirm: vi.fn(),
  loadLibrary: vi.fn(),
  openProject: vi.fn(),
}));

vi.mock('@/dialogs', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
  confirm: mocks.confirm,
  prompt: mocks.prompt,
}));

vi.mock('@/map-studio/composables/useMapStudioAutosave', () => ({
  useMapStudioAutosave: vi.fn(),
}));

vi.mock('@/map-studio/composables/useStudioHotkeys', () => ({
  useStudioHotkeys: vi.fn(),
}));

vi.mock('@/map-studio/integration/location', () => ({
  applyStudioImageToLocation: vi.fn().mockResolvedValue(undefined),
  listStudioLocationOptions: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/map-studio/components/CanvasHost.vue', async () => {
  const { defineComponent } = await import('vue');
  return {
    default: defineComponent({
      name: 'CanvasHost',
      template: '<div class="studio-canvas-stub" />',
    }),
  };
});

vi.mock('@/map-studio/components/LayerTree.vue', async () => {
  const { defineComponent, h } = await import('vue');
  const LayerTreeStub = defineComponent({
    name: 'LayerTree',
    props: { layers: { type: Array, default: () => [] } },
    emits: ['reorder'],
    setup(props, { slots }) {
      return () =>
        h(
          'div',
          { class: 'layer-tree-stub' },
          (props.layers as any[]).map((layer) =>
            slots.row?.({ layer, depth: layer.parentId ? 1 : 0 }),
          ),
        );
    },
  });
  return { default: LayerTreeStub };
});

import MapStudioView from '@/map-studio/MapStudioView.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';

async function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useMapStudioStore();
  mocks.loadLibrary.mockResolvedValue(undefined);
  mocks.openProject.mockResolvedValue(undefined);
  vi.spyOn(store, 'loadLibrary').mockImplementation(mocks.loadLibrary as any);
  vi.spyOn(store, 'openProject').mockImplementation(mocks.openProject as any);
  store.setMap(createMap(createProject().id));
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/map-studio/:projectId?/:mapId?',
        component: { render: () => h('div') },
      },
    ],
  });
  await router.push('/map-studio');
  await router.isReady();
  const wrapper = mount(MapStudioView, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, store };
}

function rowFor(wrapper: ReturnType<typeof mount>['wrapper'], name: string) {
  return wrapper
    .findAll('.studio-layer-row')
    .find((row) => row.text().includes(name))!;
}

describe('MapStudioView UI', () => {
  beforeEach(() => {
    mocks.prompt.mockReset();
    mocks.confirm.mockReset();
    mocks.loadLibrary.mockReset();
    mocks.openProject.mockReset();
    document.body.innerHTML = '';
  });

  it('creates folders from the layers panel', async () => {
    const { wrapper, store } = await mountView();
    expect(wrapper.find('[aria-label="Add layer"]').exists()).toBe(true);
    await wrapper.find('[aria-label="Add folder"]').trigger('click');
    await flushPromises();
    expect(store.map!.layers.some((layer) => layer.type === 'folder')).toBe(
      true,
    );
    expect(rowFor(wrapper, 'Folder').exists()).toBe(true);
    wrapper.unmount();
  });

  it('uses folder-open for expanded folders and toggles by clicking', async () => {
    const { wrapper, store } = await mountView();
    await wrapper.find('[aria-label="Add folder"]').trigger('click');
    await flushPromises();
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    const row = rowFor(wrapper, 'Folder');
    expect(row.find('[data-stub="QIcon"]').attributes('name')).toBe(
      'tabler-folder-open',
    );
    await row.trigger('click');
    expect(
      (
        store.map!.layers.find((layer) => layer.id === folder.id) as {
          expanded: boolean;
        }
      ).expanded,
    ).toBe(false);
    await flushPromises();
    expect(
      rowFor(wrapper, 'Folder').find('[data-stub="QIcon"]').attributes('name'),
    ).toBe('tabler-folder');
    wrapper.unmount();
  });

  it('ignores cancelled layer rename and delete', async () => {
    const { wrapper, store } = await mountView();
    await wrapper.find('[aria-label="Add folder"]').trigger('click');
    await flushPromises();
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    const row = rowFor(wrapper, 'Folder');
    await row.findAll('button').at(-1)!.trigger('click');
    mocks.prompt.mockResolvedValue(null);
    const rename = row
      .findAll('*')
      .find((node) => node.text() === 'Rename layer')!;
    await rename.trigger('click');
    await flushPromises();
    expect(
      store.map!.layers.find((layer) => layer.id === folder.id)?.name,
    ).toBe('Folder');
    mocks.confirm.mockResolvedValue(false);
    const remove = row.findAll('*').find((node) => node.text() === 'Delete')!;
    await remove.trigger('click');
    await flushPromises();
    expect(store.map!.layers.some((layer) => layer.id === folder.id)).toBe(
      true,
    );
    wrapper.unmount();
  });

  it('renames and deletes layers from the row menu', async () => {
    const { wrapper, store } = await mountView();
    await wrapper.find('[aria-label="Add folder"]').trigger('click');
    await flushPromises();
    mocks.prompt.mockResolvedValue('Renamed folder');
    const row = rowFor(wrapper, 'Folder');
    await row.findAll('button').at(-1)!.trigger('click');
    const rename = row
      .findAll('*')
      .find((node) => node.text() === 'Rename layer')!;
    await rename.trigger('click');
    await flushPromises();
    expect(
      store.map!.layers.some((layer) => layer.name === 'Renamed folder'),
    ).toBe(true);

    mocks.confirm.mockResolvedValue(true);
    const renamed = rowFor(wrapper, 'Renamed folder');
    await renamed.findAll('button').at(-1)!.trigger('click');
    const remove = renamed
      .findAll('*')
      .find((node) => node.text() === 'Delete')!;
    await remove.trigger('click');
    await flushPromises();
    expect(
      store.map!.layers.some((layer) => layer.name === 'Renamed folder'),
    ).toBe(false);
    wrapper.unmount();
  });

  it('toggles layer visibility and lock from a row', async () => {
    const { wrapper, store } = await mountView();
    const dungeon = store.map!.layers.find(
      (layer) => layer.type === 'dungeon',
    )!;
    const row = rowFor(wrapper, dungeon.name);
    await row.find('[aria-label="Toggle visibility"]').trigger('click');
    expect(
      store.map!.layers.find((layer) => layer.id === dungeon.id)?.visible,
    ).toBe(false);
    await row.find('[aria-label="Toggle lock"]').trigger('click');
    expect(
      store.map!.layers.find((layer) => layer.id === dungeon.id)?.locked,
    ).toBe(true);
    wrapper.unmount();
  });

  it('applies presets and adds preset layers', async () => {
    const { wrapper, store } = await mountView();
    const apply = wrapper.find('[title="Apply preset"]');
    expect(apply.exists()).toBe(true);
    const before = store.activeLayer!.style.floor.color;
    await apply.trigger('click');
    await flushPromises();
    expect(store.activeLayer!.style.floor.color).not.toBe('');
    expect(before).toBeTruthy();
    const count = store.map!.layers.filter(
      (layer) => layer.type === 'dungeon',
    ).length;
    const addButtons = wrapper.findAll('[title="Add layer"]');
    await addButtons.at(-1)!.trigger('click');
    await flushPromises();
    expect(
      store.map!.layers.filter((layer) => layer.type === 'dungeon'),
    ).toHaveLength(count + 1);
    wrapper.unmount();
  });

  it('edits layer style and management from layer settings', async () => {
    const { wrapper, store } = await mountView();
    store.addDungeonLayer('classic');
    await flushPromises();
    mocks.prompt.mockResolvedValue('Renamed dungeon');
    await wrapper.find('[title="Rename layer"]').trigger('click');
    await flushPromises();
    expect(store.activeLayer?.name).toBe('Renamed dungeon');

    const opacity = wrapper
      .findAll('input[type="range"]')
      .find((input) => input.attributes('max') === '1')!;
    await opacity.setValue('0.5');
    expect(store.activeLayer?.opacity).toBe(0.5);

    const floor = wrapper.findAll('input[type="color"]').at(0)!;
    await floor.setValue('#123456');
    expect(store.activeLayer?.style.floor.color).toBe('#123456');

    const wall = wrapper.findAll('input[type="color"]').at(1)!;
    await wall.setValue('#654321');
    expect(store.activeLayer?.style.walls.color).toBe('#654321');

    const wallWidth = wrapper
      .findAll('input[type="number"]')
      .find((input) => input.attributes('step') === '0.01')!;
    await wallWidth.setValue('0.2');
    expect(store.activeLayer?.style.walls.width).toBe(0.2);

    const grid = wrapper
      .findAll('input[type="checkbox"]')
      .find((input) =>
        input.element.closest('label')?.textContent?.includes('grid'),
      )!;
    await grid.setValue(false);
    expect(store.activeLayer?.style.grid.visible).toBe(false);

    mocks.confirm.mockResolvedValue(true);
    await wrapper.find('[title="Delete layer"]').trigger('click');
    await flushPromises();
    expect(store.activeLayer?.name).not.toBe('Renamed dungeon');
    wrapper.unmount();
  });

  it('moves the active layer into a folder from layer settings', async () => {
    const { wrapper, store } = await mountView();
    await wrapper.find('[aria-label="Add folder"]').trigger('click');
    await flushPromises();
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    const folderSelect = wrapper
      .findAll('select')
      .find((select) => select.findAll('option').length === 2)!;
    await folderSelect.setValue(folder.id);
    expect(store.activeLayer?.parentId).toBe(folder.id);
    wrapper.unmount();
  });

  it('shows batch properties and actions for multiple objects', async () => {
    const { wrapper, store } = await mountView();
    store.addText('A', [1, 1]);
    store.addText('B', [3, 3]);
    await flushPromises();
    store.selectObjects(store.imagesLayer!.objects.map((object) => object.id));
    await flushPromises();
    expect(wrapper.text()).toContain('2 objects selected');

    const opacity = wrapper
      .findAll('input[type="range"]')
      .find((input) => input.attributes('max') === '1')!;
    await opacity.setValue('0.4');
    expect(store.imagesLayer!.objects.map((object) => object.opacity)).toEqual([
      0.4, 0.4,
    ]);

    await wrapper.find('[title="Duplicate"]').trigger('click');
    expect(store.imagesLayer!.objects).toHaveLength(4);
    await wrapper.find('[title="Flip horizontal"]').trigger('click');
    expect(
      store.selectedObjects.every((object) => object.transform.flipX),
    ).toBe(true);
    await wrapper.find('[title="Delete"]').trigger('click');
    expect(store.imagesLayer!.objects).toHaveLength(2);
    wrapper.unmount();
  });

  it('shows only universal fields for mixed object selections', async () => {
    const { wrapper, store } = await mountView();
    store.addText('A', [1, 1]);
    store.addDoor([2, 2], [3, 2]);
    await flushPromises();
    store.updateObject(store.imagesLayer!.objects[0].id, { opacity: 0.5 });
    store.selectObjects(store.imagesLayer!.objects.map((object) => object.id));
    await flushPromises();
    expect(wrapper.text()).toContain('2 objects selected');
    expect(
      wrapper
        .findAll('select')
        .some((select) => select.findAll('option').length === 2),
    ).toBe(false);
    expect(wrapper.text()).toContain('Mixed');
    wrapper.unmount();
  });

  it('edits text object settings and actions', async () => {
    const { wrapper, store } = await mountView();
    store.addText('Hello', [2, 2]);
    await flushPromises();
    const object = store.imagesLayer!.objects[0];
    store.selectObject(object.id);
    await flushPromises();
    expect(wrapper.text()).toContain('Object settings');

    const text = wrapper.find('.studio-text-input');
    await text.setValue('Changed');
    expect(store.imagesLayer!.objects[0]).toMatchObject({ text: 'Changed' });

    const rotationLabel = wrapper
      .findAll('label')
      .find((label) => label.text().includes('Rotation'))!;
    const rotation = rotationLabel.find('input');
    await rotation.setValue('1.5');
    expect(store.imagesLayer!.objects[0].transform.rotation).toBe(1.5);

    await wrapper.find('[title="Duplicate"]').trigger('click');
    expect(store.imagesLayer!.objects).toHaveLength(2);
    await wrapper.find('[title="Bring forward"]').trigger('click');
    await wrapper.find('[title="Send backward"]').trigger('click');
    await wrapper.find('[title="Delete"]').trigger('click');
    expect(store.imagesLayer!.objects).toHaveLength(1);
    wrapper.unmount();
  });

  it('edits door and stairs object settings', async () => {
    const { wrapper, store } = await mountView();
    store.addDoor([0, 0], [1, 0]);
    store.addStairs([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    await flushPromises();
    const door = store.imagesLayer!.objects.find(
      (entry) => entry.type === 'door',
    )!;
    store.selectObject(door.id);
    await flushPromises();
    const variant = wrapper
      .findAll('select')
      .find((select) => select.findAll('option').length === 2)!;
    await variant.setValue('1');
    expect(
      store.imagesLayer!.objects.find((entry) => entry.id === door.id),
    ).toMatchObject({ variant: 1 });

    const stairs = store.imagesLayer!.objects.find(
      (entry) => entry.type === 'stairs',
    )!;
    store.selectObject(stairs.id);
    await flushPromises();
    const steps = wrapper
      .findAll('input[type="number"]')
      .find((input) => input.attributes('min') === '1')!;
    await steps.setValue('5');
    expect(
      store.imagesLayer!.objects.find((entry) => entry.id === stairs.id),
    ).toMatchObject({ stepsPerCell: 5 });
    wrapper.unmount();
  });

  it('moves layers up, down, and back to the root', async () => {
    const { wrapper, store } = await mountView();
    await wrapper.find('[aria-label="Add folder"]').trigger('click');
    await flushPromises();
    const dungeon = store.map!.layers.find(
      (layer) => layer.type === 'dungeon',
    )!;
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    store.setLayerParent(dungeon.id, folder.id);
    await flushPromises();
    const row = rowFor(wrapper, dungeon.name);
    await row.findAll('button').at(-1)!.trigger('click');
    const moveOut = row
      .findAll('*')
      .find((node) => node.text() === 'Move out of folder')!;
    await moveOut.trigger('click');
    await flushPromises();
    expect(
      store.map!.layers.find((layer) => layer.id === dungeon.id)?.parentId,
    ).toBeNull();

    store.addDungeonLayer('classic');
    await flushPromises();
    const added = store.activeLayer!;
    const before = added.order;
    await wrapper.find('[title="Move layer up"]').trigger('click');
    expect(store.activeLayer?.order).not.toBe(before);
    await wrapper.find('[title="Move layer down"]').trigger('click');
    expect(store.activeLayer?.id).toBe(added.id);
    wrapper.unmount();
  });

  it('activates a dungeon layer when its row is clicked', async () => {
    const { wrapper, store } = await mountView();
    store.addDungeonLayer('classic');
    await flushPromises();
    const added = store.map!.layers.filter(
      (layer) => layer.type === 'dungeon',
    )[1];
    store.renameLayer(added.id, 'Upper level');
    await flushPromises();
    await rowFor(wrapper, 'Upper level').trigger('click');
    expect(store.activeLayerId).toBe(added.id);
    wrapper.unmount();
  });
});
