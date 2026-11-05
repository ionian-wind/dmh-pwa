import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const relationMocks = vi.hoisted(() => ({
  loadFor: vi.fn().mockResolvedValue(undefined),
  getLinkedIds: vi.fn(() => ['m1']),
  setLinkedIds: vi.fn().mockResolvedValue(undefined),
  items: vi.fn(() => [
    { id: 'm1', name: 'Campaign' },
    { id: 'm2', name: 'Second' },
  ]),
}));

vi.mock('@/components/common/entityDragLinking/relations', () => ({
  useEntityLinkRelations: () => relationMocks,
}));

import EntityDragLinkingOverlay from '@/components/common/entityDragLinking/EntityDragLinkingOverlay.vue';
import EntityDragLinkDialog from '@/components/common/entityDragLinking/EntityDragLinkDialog.vue';
import { useEntityDragLinking } from '@/components/common/entityDragLinking/useEntityDragLinking';

const EntityDragLinkDialogStub = defineComponent({
  name: 'EntityDragLinkDialog',
  props: { source: Object, kind: String },
  emits: ['close'],
  setup() {
    return () => h('div', { class: 'drag-link-dialog-stub' });
  },
});

const EntityLinkingDialogStub = defineComponent({
  name: 'EntityLinkingDialog',
  props: {
    isOpen: Boolean,
    kind: String,
    title: String,
    options: Array,
    linkedIds: Array,
  },
  emits: ['add', 'cancel'],
  setup() {
    return () => h('div', { class: 'entity-linking-dialog-stub' });
  },
});

describe('entity drag linking UI', () => {
  afterEach(() => {
    useEntityDragLinking().closeDialog();
    useEntityDragLinking().endDrag();
  });

  it('tracks drag, drop, cancel and dialog state', () => {
    const drag = useEntityDragLinking();
    drag.startDrag({ kind: 'note', id: 'n1', title: 'Note' });
    expect(drag.isDragging.value).toBe(true);

    drag.dropOnKind('module');
    expect(drag.isDragging.value).toBe(false);
    expect(drag.dialogSource.value?.id).toBe('n1');
    expect(drag.dialogTargetKind.value).toBe('module');
    expect(drag.isDialogOpen.value).toBe(true);

    drag.closeDialog();
    expect(drag.isDialogOpen.value).toBe(false);

    drag.startDrag({ kind: 'party', id: 'p1', title: 'Party' });
    drag.cancelDrop();
    expect(drag.isDragging.value).toBe(false);

    drag.startDrag({ kind: 'party', id: 'p1', title: 'Party' });
    drag.endDrag();
    expect(drag.isDragging.value).toBe(false);
  });

  it('renders allowed drop targets and opens the linking dialog', async () => {
    const drag = useEntityDragLinking();
    drag.startDrag({ kind: 'note', id: 'n1', title: 'Note' });

    const wrapper = mount(EntityDragLinkingOverlay, {
      global: {
        stubs: { EntityDragLinkDialog: EntityDragLinkDialogStub },
      },
    });
    await nextTick();

    expect(
      document.documentElement.classList.contains('entity-drag-active'),
    ).toBe(true);
    expect(document.body.classList.contains('entity-drag-active')).toBe(true);

    const cards = wrapper.findAll('.entity-drag-drop-card');
    expect(cards).toHaveLength(2);
    expect(wrapper.find('.entity-drag-overlay-title').text()).toBe(
      'Link Note to:',
    );
    expect(cards.map((card) => card.attributes('aria-label'))).toEqual([
      'Modules',
      'Locations',
    ]);

    await cards[0].trigger('dragenter');
    await nextTick();
    expect(
      wrapper
        .findAll('.entity-drag-drop-card')[0]
        .find('.entity-drag-drop-card-inner')
        .classes(),
    ).toContain('entity-drag-drop-card--hovered');

    await wrapper.find('.entity-drag-overlay').trigger('dragover');
    await nextTick();
    expect(
      wrapper
        .findAll('.entity-drag-drop-card')[0]
        .find('.entity-drag-drop-card-inner')
        .classes(),
    ).not.toContain('entity-drag-drop-card--hovered');

    await wrapper.findAll('.entity-drag-drop-card')[0].trigger('dragenter');
    await wrapper.findAll('.entity-drag-drop-card')[0].trigger('drop');
    await nextTick();

    expect(wrapper.find('.entity-drag-overlay').exists()).toBe(false);
    expect(
      document.documentElement.classList.contains('entity-drag-active'),
    ).toBe(false);
    const dialog = wrapper.findComponent(EntityDragLinkDialogStub);
    expect(dialog.props()).toMatchObject({
      source: { kind: 'note', id: 'n1', title: 'Note' },
      kind: 'module',
    });

    dialog.vm.$emit('close');
    expect(useEntityDragLinking().isDialogOpen.value).toBe(false);
    wrapper.unmount();
  });

  it('cancels the overlay when dropping on its background', async () => {
    const drag = useEntityDragLinking();
    drag.startDrag({ kind: 'monster', id: 'mo1', title: 'Monster' });

    const wrapper = mount(EntityDragLinkingOverlay, {
      global: {
        stubs: { EntityDragLinkDialog: EntityDragLinkDialogStub },
      },
    });
    await nextTick();
    expect(wrapper.findAll('.entity-drag-drop-card')).toHaveLength(3);

    await wrapper.find('.entity-drag-overlay').trigger('drop');
    expect(drag.isDragging.value).toBe(false);
    wrapper.unmount();
  });

  it('loads options and applies links from the dialog', async () => {
    const wrapper = mount(EntityDragLinkDialog, {
      props: {
        source: { kind: 'note', id: 'n1', title: 'Note' },
        kind: 'module',
      },
      global: {
        stubs: { EntityLinkingDialog: EntityLinkingDialogStub },
      },
    });
    await flushPromises();

    expect(relationMocks.loadFor).toHaveBeenCalledWith('note', 'module');
    const dialog = wrapper.findComponent(EntityLinkingDialogStub);
    expect(dialog.props()).toMatchObject({
      isOpen: true,
      kind: 'module',
      title: 'Modules',
      linkedIds: ['m1'],
      options: [
        { id: 'm1', label: 'Campaign' },
        { id: 'm2', label: 'Second' },
      ],
    });

    dialog.vm.$emit('add', {
      refs: [
        { kind: 'module', id: 'm2' },
        { kind: 'note', id: 'ignored' },
      ],
    });
    await flushPromises();
    expect(relationMocks.setLinkedIds).toHaveBeenCalledWith(
      'note',
      'n1',
      'module',
      ['m2'],
    );
    expect(wrapper.emitted('close')).toHaveLength(1);

    dialog.vm.$emit('cancel');
    expect(wrapper.emitted('close')).toHaveLength(2);
    wrapper.unmount();
  });

  it('clears the highlighted target when the drag overlay disappears', async () => {
    const drag = useEntityDragLinking();
    drag.startDrag({ kind: 'note', id: 'n1', title: 'Note' });

    const wrapper = mount(EntityDragLinkingOverlay, {
      global: {
        stubs: { EntityDragLinkDialog: EntityDragLinkDialogStub },
      },
    });
    await nextTick();

    await wrapper.findAll('.entity-drag-drop-card')[0].trigger('dragenter');
    await nextTick();
    expect(
      wrapper
        .findAll('.entity-drag-drop-card')[0]
        .find('.entity-drag-drop-card-inner')
        .classes(),
    ).toContain('entity-drag-drop-card--hovered');

    drag.cancelDrop();
    await nextTick();
    expect(wrapper.find('.entity-drag-overlay').exists()).toBe(false);

    drag.startDrag({ kind: 'note', id: 'n1', title: 'Note' });
    await nextTick();
    expect(
      wrapper
        .findAll('.entity-drag-drop-card')[0]
        .find('.entity-drag-drop-card-inner')
        .classes(),
    ).not.toContain('entity-drag-drop-card--hovered');
    wrapper.unmount();
  });
});
