import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import StudioHeader from '@/map-studio/components/StudioHeader.vue';
import StudioPresetsPanel from '@/map-studio/components/StudioPresetsPanel.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
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
    console.log(
      count,
      wrapper.findAll('.studio-preset-row').length,
      wrapper.findAll('[title="Add layer"]').length,
    );
    await wrapper
      .findAll('.studio-preset-row')[1]
      .find('[title="Add layer"]')
      .trigger('click');
    await nextTick();
    console.log(
      store.map!.layers.filter((layer) => layer.type === 'dungeon').length,
    );
    expect(
      store.map!.layers.filter((layer) => layer.type === 'dungeon'),
    ).toHaveLength(count + 1);
    wrapper.unmount();
  });
});
