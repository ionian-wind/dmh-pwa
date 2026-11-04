import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
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

import EntitiesLinking from '@/components/common/EntitiesLinking.vue';

const EntityCreateDialogStub = defineComponent({
  name: 'EntityCreateDialog',
  props: { kind: { type: String, required: true } },
  emits: ['created', 'cancel'],
  setup() {
    return () => h('div', { class: 'entity-create-stub' });
  },
});

const QVirtualScrollStub = defineComponent({
  name: 'QVirtualScroll',
  props: { items: { type: Array, default: () => [] } },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        { class: 'q-virtual-scroll-stub' },
        (props.items as any[]).flatMap(
          (item) => slots.default?.({ item }) ?? [],
        ),
      );
  },
});

describe('EntitiesLinking', () => {
  it('shows the entity type title, linked entities and removes links', async () => {
    const wrapper = mount(EntitiesLinking, {
      props: { kind: 'note', modelValue: [] },
      global: {
        stubs: {
          QVirtualScroll: QVirtualScrollStub,
          EntityCreateDialog: EntityCreateDialogStub,
        },
      },
    });

    expect(wrapper.text()).toContain('Notes');
    expect(wrapper.find('.entity-group').exists()).toBe(true);
    expect(wrapper.text()).toContain('No linked entities.');

    await wrapper.setProps({
      modelValue: [
        { kind: 'note', id: 'n1' },
        { kind: 'map', id: 'map1' },
      ],
    });

    expect(wrapper.text()).toContain('Alpha note');
    expect(wrapper.findAll('.linked-entity-item')).toHaveLength(1);
    expect(wrapper.findAll('button[aria-label="Remove"]')).toHaveLength(1);

    await wrapper.find('button[aria-label="Remove"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      [{ kind: 'map', id: 'map1' }],
    ]);
  });

  it('accepts a custom label and option source', async () => {
    const wrapper = mount(EntitiesLinking, {
      props: {
        kind: 'note',
        label: 'Custom notes',
        options: [{ id: 'x1', label: 'External note' }],
        modelValue: [],
      },
      global: {
        stubs: {
          QVirtualScroll: QVirtualScrollStub,
          EntityCreateDialog: EntityCreateDialogStub,
        },
      },
    });

    expect(wrapper.text()).toContain('Custom notes');
    await wrapper.find('button[aria-label="Add"]').trigger('click');

    expect(wrapper.text()).toContain('External note');
    expect(wrapper.text()).not.toContain('Alpha note');
  });

  it('limits selection to one entity when multiple is false', async () => {
    const wrapper = mount(EntitiesLinking, {
      props: { kind: 'note', modelValue: [], multiple: false },
      global: {
        stubs: {
          QVirtualScroll: QVirtualScrollStub,
          EntityCreateDialog: EntityCreateDialogStub,
        },
      },
    });

    await wrapper.find('button[aria-label="Add"]').trigger('click');

    const optionRows = wrapper
      .findAll('[data-stub="QItem"]')
      .filter((row) => ['Alpha note', 'Beta note'].includes(row.text()));

    await optionRows[0].trigger('click');
    await optionRows[1].trigger('click');

    const addButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add');
    await addButton!.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      [{ kind: 'note', id: 'n2' }],
    ]);
  });

  it('creates a related entity and marks it in the option list', async () => {
    const wrapper = mount(EntitiesLinking, {
      props: { kind: 'note', modelValue: [] },
      global: {
        stubs: {
          QVirtualScroll: QVirtualScrollStub,
          EntityCreateDialog: EntityCreateDialogStub,
        },
      },
    });

    await wrapper.find('button[aria-label="Add"]').trigger('click');
    const createButton = wrapper.find('button[aria-label="Create"]');
    expect(createButton.exists()).toBe(true);
    await createButton.trigger('click');

    const createDialog = wrapper.findComponent(EntityCreateDialogStub);
    expect(createDialog.exists()).toBe(true);
    expect(createDialog.props('kind')).toBe('note');

    createDialog.vm.$emit('created', {
      ref: { kind: 'note', id: 'n3' },
      label: 'Gamma note',
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Gamma note');
    expect(wrapper.text()).toContain('Created');

    const addButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add');
    await addButton!.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      [{ kind: 'note', id: 'n3' }],
    ]);
  });

  it('hides add and remove actions in readonly mode', () => {
    const wrapper = mount(EntitiesLinking, {
      props: {
        kind: 'note',
        modelValue: [{ kind: 'note', id: 'n1' }],
        readonly: true,
      },
      global: {
        stubs: {
          QVirtualScroll: QVirtualScrollStub,
          EntityCreateDialog: EntityCreateDialogStub,
        },
      },
    });

    expect(wrapper.text()).toContain('Alpha note');
    expect(wrapper.find('button[aria-label="Add"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Remove"]').exists()).toBe(false);
    expect(wrapper.findComponent(EntityCreateDialogStub).exists()).toBe(false);
  });

  it('filters the search modal and adds multiple selected entities', async () => {
    const wrapper = mount(EntitiesLinking, {
      props: { kind: 'note', modelValue: [] },
      global: {
        stubs: {
          QVirtualScroll: QVirtualScrollStub,
          EntityCreateDialog: EntityCreateDialogStub,
        },
      },
    });

    await wrapper.find('button[aria-label="Add"]').trigger('click');
    expect(wrapper.findComponent(QVirtualScrollStub).exists()).toBe(true);

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
