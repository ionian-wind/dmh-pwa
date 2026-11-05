import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import BaseCard from '@/components/common/BaseCard.vue';
import { useEntityDragLinking } from '@/components/common/entityDragLinking/useEntityDragLinking';

describe('BaseCard entity dragging', () => {
  afterEach(() => {
    useEntityDragLinking().endDrag();
  });

  it('shows a drag handle and a ghost for draggable cards', async () => {
    const wrapper = mount(BaseCard, {
      props: {
        title: 'Note title',
        dragEntity: { kind: 'note', id: 'n1', title: 'Note title' },
      },
    });

    expect(wrapper.find('.entity-drag-handle').exists()).toBe(true);
    expect(wrapper.find('.entity-drag-ghost-card').text()).toContain(
      'Note title',
    );

    const dataTransfer = {
      effectAllowed: 'none',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };
    await wrapper
      .find('.entity-drag-handle')
      .trigger('dragstart', { dataTransfer });

    expect(dataTransfer.effectAllowed).toBe('link');
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      'application/x-dmh-entity',
      JSON.stringify({ kind: 'note', id: 'n1', title: 'Note title' }),
    );
    expect(dataTransfer.setDragImage).toHaveBeenCalled();
    expect(useEntityDragLinking().draggedEntity.value?.id).toBe('n1');

    await wrapper.find('.entity-drag-handle').trigger('dragend');
    expect(useEntityDragLinking().draggedEntity.value).toBeNull();
    wrapper.unmount();
  });

  it('does not render a drag handle without drag data', () => {
    const wrapper = mount(BaseCard, { props: { title: 'Plain' } });

    expect(wrapper.find('.entity-drag-handle').exists()).toBe(false);
    expect(wrapper.find('.entity-drag-ghost').exists()).toBe(false);
    wrapper.unmount();
  });
});
