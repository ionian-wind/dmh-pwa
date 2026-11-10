import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

const promptMock = vi.mocked(prompt);
const confirmMock = vi.mocked(confirm);
import { createPinia, setActivePinia } from 'pinia';
vi.mock('@/dialogs', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn().mockResolvedValue(true),
  prompt: vi.fn().mockResolvedValue('Renamed'),
}));

import StudioHeader from '@/map-studio/components/StudioHeader.vue';
import StudioPresetsPanel from '@/map-studio/components/StudioPresetsPanel.vue';
import StudioLayerSettings from '@/map-studio/components/StudioLayerSettings.vue';
import StudioObjectSettings from '@/map-studio/components/StudioObjectSettings.vue';
import StudioClipboardPanel from '@/map-studio/components/StudioClipboardPanel.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import { confirm, prompt } from '@/dialogs';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';

describe('StudioHeader', () => {
  function mountHeader(overrides: Record<string, any> = {}) {
    return mount(StudioHeader, {
      props: {
        name: 'Map',
        autosave: 'idle',
        dirty: false,
        canUndo: true,
        canRedo: true,
        hasMaps: true,
        ...overrides,
      },
    });
  }

  it('shows autosave and dirty badges', async () => {
    const saving = mountHeader({ autosave: 'saving' });
    expect(saving.findComponent({ name: 'QBadge' }).exists()).toBe(true);
    saving.unmount();
    const dirty = mountHeader({ dirty: true });
    expect(dirty.findComponent({ name: 'QBadge' }).exists()).toBe(true);
    dirty.unmount();
    const saved = mountHeader({ autosave: 'saved' });
    expect(saved.findComponent({ name: 'QBadge' }).exists()).toBe(true);
    saved.unmount();
    const idle = mountHeader();
    expect(idle.findComponent({ name: 'QBadge' }).exists()).toBe(false);
    idle.unmount();
    const unnamed = mountHeader({ name: '' });
    expect(unnamed.text()).toContain('Map Studio');
    unnamed.unmount();
  });

  it('emits header actions', async () => {
    const wrapper = mountHeader();
    await wrapper.find('[aria-label="Back to library"]').trigger('click');
    await wrapper.find('[aria-label="Undo"]').trigger('click');
    await wrapper.find('[aria-label="Redo"]').trigger('click');
    const save = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Save')!;
    await save.trigger('click');
    const apply = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Apply to location'))!;
    await apply.trigger('click');
    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('icon') === 'tabler-download')!;
    await exportButton.trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
    expect(wrapper.emitted('undo')).toHaveLength(1);
    expect(wrapper.emitted('redo')).toHaveLength(1);
    expect(wrapper.emitted('save')).toHaveLength(1);
    expect(wrapper.emitted('apply')).toHaveLength(1);
    expect(wrapper.emitted('export')?.[0]).toEqual(['png']);
    const webp = wrapper
      .findAllComponents({ name: 'QItem' })
      .find((item) => item.text() === 'WebP')!;
    await webp.trigger('click');
    expect(wrapper.emitted('export')?.[1]).toEqual(['webp']);
    const pdf = wrapper
      .findAllComponents({ name: 'QItem' })
      .find((item) => item.text() === 'PDF')!;
    await pdf.trigger('click');
    expect(wrapper.emitted('export-pdf')).toHaveLength(1);
    wrapper.unmount();
  });
});

describe('StudioPresetsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('applies presets and adds preset layers', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    const wrapper = mount(StudioPresetsPanel, {
      global: { plugins: [pinia] },
    });
    const rows = wrapper.findAll('.studio-preset-row');
    expect(rows).toHaveLength(4);
    expect(wrapper.text()).toContain('Classic');
    const apply = rows[0].find('[title="Apply preset"]');
    await apply.trigger('click');
    expect(store.activeLayer?.style).toBeTruthy();
    await nextTick();
    const count = store.map!.layers.filter(
      (layer) => layer.type === 'dungeon',
    ).length;
    await wrapper
      .findAll('.studio-preset-row')[1]
      .find('[title="Add layer"]')
      .trigger('click');
    await nextTick();
    expect(
      store.map!.layers.filter((layer) => layer.type === 'dungeon'),
    ).toHaveLength(count + 1);
    wrapper.unmount();
  });
});

describe('StudioLayerSettings', () => {
  it('renders nothing without a map and edits the active layer', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMapStudioStore();
    const empty = mount(StudioLayerSettings, {
      global: { plugins: [pinia] },
    });
    expect(empty.text()).toBe('');
    empty.unmount();

    store.setMap(createMap(createProject().id));
    store.addFolder('Folder');
    const wrapper = mount(StudioLayerSettings, {
      global: { plugins: [pinia] },
    });
    expect(wrapper.text()).toContain('Layer settings');
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    const select = wrapper.find('select');
    await select.setValue(folder.id);
    expect(store.activeLayer?.parentId).toBe(folder.id);

    promptMock.mockResolvedValueOnce(undefined);
    await wrapper.find('[title="Rename layer"]').trigger('click');
    await flushPromises();
    confirmMock.mockResolvedValueOnce(false);
    await wrapper.find('[title="Delete layer"]').trigger('click');
    await flushPromises();
    expect(store.activeLayer).toBeTruthy();
    wrapper.unmount();
  });
});

describe('StudioObjectSettings', () => {
  it('renders nothing without a selected object and edits image position', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMapStudioStore();
    const empty = mount(StudioObjectSettings, {
      global: { plugins: [pinia] },
    });
    expect(empty.text()).toBe('');
    empty.unmount();

    store.setMap(createMap(createProject().id));
    store.addImage('data:image/png;base64,AA==', [1, 1], 2, 2);
    const image = store.imagesLayer!.objects[0];
    store.selectObject(image.id);
    const wrapper = mount(StudioObjectSettings, {
      global: { plugins: [pinia] },
    });
    expect(wrapper.text()).toContain('X / Y');
    const x = wrapper.findAll('input[type="number"]')[0];
    await x.setValue('4');
    expect(store.imagesLayer!.objects[0].transform.x).toBe(4);
    wrapper.unmount();
  });

  it('edits text style and shadow settings', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addText('Label', [1, 1]);
    const object = store.imagesLayer!.objects[0];
    store.selectObject(object.id);
    const wrapper = mount(StudioObjectSettings, {
      global: { plugins: [pinia] },
    });
    const selects = wrapper.findAll('select');
    await selects[0].setValue('Arial, sans-serif');
    await selects[1].setValue('center');
    const shadowToggle = wrapper
      .findAll('input[type="checkbox"]')
      .find((input) =>
        input.element.closest('label')?.textContent?.includes('Drop shadow'),
      )!;
    await shadowToggle.setValue(true);
    expect(
      store.imagesLayer!.objects[0].type === 'text' &&
        store.imagesLayer!.objects[0].shadow.enabled,
    ).toBe(true);
    const colorInputs = wrapper.findAll('input[type="color"]');
    await colorInputs.at(-1)!.setValue('#abcdef');
    const fieldInput = (label: string) =>
      wrapper
        .findAll('label')
        .find((entry) => entry.text().includes(label))!
        .find('input[type="number"]');
    await fieldInput('Offset X').setValue('0.1');
    await fieldInput('Offset Y').setValue('0.2');
    await fieldInput('Shadow opacity').setValue('0.7');
    expect(
      store.imagesLayer!.objects[0].type === 'text' &&
        store.imagesLayer!.objects[0].shadow,
    ).toMatchObject({
      color: '#abcdef',
      offsetX: 0.1,
      offsetY: 0.2,
      opacity: 0.7,
    });
    wrapper.unmount();
  });
});

describe('StudioClipboardPanel', () => {
  it('handles empty and cancelled clipboard saves', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    const empty = mount(StudioClipboardPanel, {
      global: { plugins: [pinia] },
    });
    expect(empty.text()).toContain('Select geometry');
    await (empty.vm as any).saveClipboard();
    expect((empty.vm as any).thumbnailPoints([])).toBe('');
    (empty.vm as any).pasteClip('missing');
    expect(empty.emitted('paste')).toBeUndefined();
    expect(store.geometryClips).toHaveLength(0);
    empty.unmount();

    store.addRectangle({ x: 0, y: 0, width: 4, height: 4 });
    store.copyGeometrySelection([
      [1, 1],
      [3, 1],
      [3, 3],
      [1, 3],
    ]);
    promptMock.mockResolvedValueOnce(null);
    const wrapper = mount(StudioClipboardPanel, {
      global: { plugins: [pinia] },
    });
    await wrapper.find('[title="Save clipboard"]').trigger('click');
    await flushPromises();
    expect(store.geometryClips).toHaveLength(0);
    wrapper.unmount();
  });

  it('saves, pastes and deletes clipboard clips', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addRectangle({ x: 0, y: 0, width: 4, height: 4 });
    store.copyGeometrySelection([
      [1, 1],
      [3, 1],
      [3, 3],
      [1, 3],
    ]);
    promptMock.mockResolvedValue('Room clip');
    const wrapper = mount(StudioClipboardPanel, {
      global: { plugins: [pinia] },
    });
    await wrapper.find('[title="Save clipboard"]').trigger('click');
    await flushPromises();
    expect(store.geometryClips[0].name).toBe('Room clip');
    await wrapper.find('.studio-clipboard-row').trigger('click');
    expect(wrapper.emitted('paste')?.[0]?.[0]).toEqual(
      store.geometryClips[0].polygons,
    );
    await wrapper
      .find('.studio-clipboard-row [aria-label="Delete"]')
      .trigger('click');
    expect(store.geometryClips).toHaveLength(0);
    expect(wrapper.text()).toContain('Select geometry');
    wrapper.unmount();
  });
});
