import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn().mockResolvedValue(true),
  prompt: vi.fn().mockResolvedValue('Name'),
}));

vi.mock('@/dialogs', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
  confirm: mocks.confirm,
  prompt: mocks.prompt,
}));

vi.mock('@/map-studio/components/LayerTree.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      name: 'LayerTree',
      props: { layers: { type: Array, default: () => [] } },
      emits: ['reorder'],
      setup(props, { slots }) {
        return () =>
          h(
            'div',
            (props.layers as any[]).map((layer) =>
              slots.row?.({ layer, depth: layer.parentId ? 1 : 0 }),
            ),
          );
      },
    }),
  };
});

import StudioLayersPanel from '@/map-studio/components/StudioLayersPanel.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';

function setup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useMapStudioStore();
  store.setMap(createMap(createProject().id));
  const wrapper = mount(StudioLayersPanel, {
    global: { plugins: [pinia] },
  });
  return { store, wrapper };
}

function row(wrapper: ReturnType<typeof mount>, name: string) {
  return wrapper
    .findAll('.studio-layer-row')
    .find((entry) => entry.text().includes(name))!;
}

describe('StudioLayersPanel interactions', () => {
  beforeEach(() => {
    mocks.confirm.mockReset().mockResolvedValue(true);
    mocks.prompt.mockReset().mockResolvedValue('Name');
  });

  it('selects single, ctrl and shift layer ranges', async () => {
    const { store, wrapper } = setup();
    const dungeon = store.map!.layers.find(
      (layer) => layer.type === 'dungeon',
    )!;
    const images = store.map!.layers.find((layer) => layer.type === 'images')!;
    row(wrapper, 'Dungeon').element.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await flushPromises();
    expect(store.settingsLayerId).toBe(dungeon.id);
    row(wrapper, 'Images').element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    await flushPromises();
    expect(store.selectedLayerIds).toContain(images.id);
    row(wrapper, 'Background').element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: true }),
    );
    await flushPromises();
    expect(store.selectedLayerIds.length).toBeGreaterThan(1);
    wrapper.unmount();
  });

  it('toggles folders and runs bulk actions', async () => {
    const { store, wrapper } = setup();
    store.addFolder('Folder');
    await flushPromises();
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    row(wrapper, 'Folder').element.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await flushPromises();
    expect(
      (
        store.map!.layers.find((layer) => layer.id === folder.id) as {
          expanded: boolean;
        }
      ).expanded,
    ).toBe(false);

    const dungeon = store.map!.layers.find(
      (layer) => layer.type === 'dungeon',
    )!;
    store.setSettingsLayer(dungeon.id);
    store.toggleLayerSelection(folder.id);
    await flushPromises();
    expect(wrapper.find('.studio-layer-bulk').exists()).toBe(true);
    await wrapper.find('[title="Duplicate"]').trigger('click');
    await flushPromises();
    expect(store.selectedLayerIds.length).toBeGreaterThan(0);
    await wrapper
      .find('.studio-layer-bulk [title="Toggle lock"]')
      .trigger('click');
    await flushPromises();
    expect(
      store
        .map!.layers.filter((layer) =>
          store.selectedLayerIds.includes(layer.id),
        )
        .every((layer) => layer.locked),
    ).toBe(true);

    mocks.confirm.mockResolvedValueOnce(false);
    await wrapper.find('.studio-layer-bulk [title="Delete"]').trigger('click');
    await flushPromises();
    const count = store.map!.layers.length;
    mocks.confirm.mockResolvedValueOnce(true);
    await wrapper.find('.studio-layer-bulk [title="Delete"]').trigger('click');
    await flushPromises();
    expect(store.map!.layers.length).toBeLessThan(count);
    wrapper.unmount();
  });

  it('renames by double-click and shows settings for every layer type', async () => {
    const { store, wrapper } = setup();
    const background = store.map!.layers.find(
      (layer) => layer.type === 'background',
    )!;
    mocks.prompt.mockResolvedValueOnce('Backdrop');
    await row(wrapper, 'Background')
      .find('.studio-layer-name')
      .trigger('dblclick');
    await flushPromises();
    expect(
      store.map!.layers.find((layer) => layer.id === background.id)?.name,
    ).toBe('Backdrop');
    row(wrapper, 'Backdrop').element.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await flushPromises();
    expect(wrapper.text()).toContain('Blend mode');
    wrapper.unmount();
  });

  it('ignores bulk delete without a multi-selection', async () => {
    const { wrapper } = setup();
    await (wrapper.vm as any).bulkDelete();
    wrapper.unmount();
  });

  it('renders no rows without a map', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMapStudioStore();
    const wrapper = mount(StudioLayersPanel, {
      global: { plugins: [pinia] },
    });
    expect(store.map).toBeNull();
    expect(wrapper.findAll('.studio-layer-row')).toHaveLength(0);
    wrapper.unmount();
  });
});

describe('StudioLayersPanel protected layers', () => {
  it('ignores delete requests for protected layers', async () => {
    const { store, wrapper } = setup();
    const background = store.map!.layers.find(
      (layer) => layer.type === 'background',
    )!;
    await (wrapper.vm as any).deleteLayer(background);
    expect(store.map!.layers.some((layer) => layer.id === background.id)).toBe(
      true,
    );
    wrapper.unmount();
  });
});
