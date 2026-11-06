import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import BaseCard from '@/components/common/BaseCard.vue';
import { useEntityDragLinking } from '@/components/common/entityDragLinking/useEntityDragLinking';

describe('BaseCard entity dragging', () => {
  afterEach(() => {
    useEntityDragLinking().endDrag();
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it('reserves the resting card space while floating on hover', async () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as any);
    const wrapper = mount(BaseCard, { props: { title: 'Card' } });
    const shell = wrapper.find('.base-card-shell');
    Object.defineProperty(shell.element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ height: 150 }),
    });

    await shell.trigger('mouseenter');
    await nextTick();
    expect(shell.classes()).toContain('is-floating');
    expect(shell.attributes('style')).toContain('height: 150px');

    await shell.trigger('mouseleave');
    vi.advanceTimersByTime(329);
    await nextTick();
    expect(shell.classes()).toContain('is-floating');

    await shell.trigger('mouseenter');
    vi.advanceTimersByTime(400);
    await nextTick();
    expect(shell.classes()).toContain('is-floating');

    await shell.trigger('mouseleave');
    vi.advanceTimersByTime(331);
    await nextTick();
    expect(shell.classes()).not.toContain('is-floating');
    wrapper.unmount();
  });

  it('floats on keyboard focus and ignores focus moving within the card', async () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as any);
    const wrapper = mount(BaseCard, {
      props: { title: 'Card' },
      slots: { default: '<button class="inner-button">Action</button>' },
    });
    const shell = wrapper.find('.base-card-shell');
    Object.defineProperty(shell.element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ height: 120 }),
    });

    await shell.trigger('focusin');
    await nextTick();
    expect(shell.classes()).toContain('is-floating');

    await shell.trigger('focusout', {
      relatedTarget: wrapper.find('.inner-button').element,
    });
    vi.advanceTimersByTime(400);
    await nextTick();
    expect(shell.classes()).toContain('is-floating');

    await shell.trigger('focusout', { relatedTarget: null });
    vi.advanceTimersByTime(331);
    await nextTick();
    expect(shell.classes()).not.toContain('is-floating');
    wrapper.unmount();
  });

  it('does not float when hover-capable pointers are unavailable', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as any);
    const wrapper = mount(BaseCard, { props: { title: 'Card' } });
    const shell = wrapper.find('.base-card-shell');

    await shell.trigger('mouseenter');
    await nextTick();
    expect(shell.classes()).not.toContain('is-floating');
    wrapper.unmount();
  });
});
