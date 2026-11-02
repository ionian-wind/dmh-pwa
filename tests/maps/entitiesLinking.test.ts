import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const catalog = vi.hoisted(() => ({
  groups: [
    {
      kind: 'note',
      labelKey: 'notes.title',
      titleField: 'title',
      items: [
        { id: 'n1', label: 'Alpha note' },
        { id: 'n2', label: 'Beta note' },
      ],
    },
  ],
}));

vi.mock('@/maps/composables/useMapEntityCatalog', () => ({
  useMapEntityCatalog: () => ({
    groups: { value: catalog.groups },
    getLabel: (ref: { kind: string; id: string }) =>
      catalog.groups
        .find((group) => group.kind === ref.kind)
        ?.items.find((item) => item.id === ref.id)?.label ?? ref.id,
  }),
}));

import EntitiesLinking from '@/maps/components/EntitiesLinking.vue';

describe('EntitiesLinking', () => {
  it('shows the entity type title, linked entities and removes links', async () => {
    const wrapper = mount(EntitiesLinking, {
      props: { kind: 'note', modelValue: [] },
    });

    expect(wrapper.text()).toContain('Notes');
    expect(wrapper.text()).toContain('No linked entities.');

    await wrapper.setProps({
      modelValue: [
        { kind: 'note', id: 'n1' },
        { kind: 'map', id: 'map1' },
      ],
    });

    expect(wrapper.text()).toContain('Alpha note');
    expect(wrapper.findAll('button[aria-label="Remove"]')).toHaveLength(1);

    await wrapper.find('button[aria-label="Remove"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      [{ kind: 'map', id: 'map1' }],
    ]);
  });

  it('filters the search modal and adds multiple selected entities', async () => {
    const wrapper = mount(EntitiesLinking, {
      props: { kind: 'note', modelValue: [] },
    });

    await wrapper.find('button[aria-label="Add"]').trigger('click');

    const search = wrapper.find('input');
    await search.setValue('beta');
    expect(wrapper.text()).toContain('Beta note');
    expect(wrapper.text()).not.toContain('Alpha note');

    await search.setValue('');
    const optionRows = wrapper
      .findAll('[data-stub="QItem"]')
      .filter((row) => ['Alpha note', 'Beta note'].includes(row.text()));
    expect(optionRows).toHaveLength(2);

    await optionRows[0].trigger('click');
    await optionRows[1].trigger('click');

    const addButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add');
    expect(addButton).toBeTruthy();
    await addButton!.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      [
        { kind: 'note', id: 'n1' },
        { kind: 'note', id: 'n2' },
      ],
    ]);
  });
});
