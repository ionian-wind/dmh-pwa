import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import TagInsertPopup from '@/components/common/milkdown/TagInsertPopup.vue';

function mountPopup(overrides: Record<string, unknown> = {}) {
  return mount(TagInsertPopup, {
    props: {
      tags: ['harbor', 'forest', 'history'],
      query: 'h',
      position: { top: 10, left: 20 },
      onSelect: vi.fn(),
      onCreate: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    },
    attachTo: document.body,
  });
}

describe('TagInsertPopup', () => {
  it('filters tags and selects one', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const wrapper = mountPopup({ onSelect, onClose });

    expect(wrapper.text()).toContain('#harbor');
    expect(wrapper.text()).toContain('#history');
    expect(wrapper.text()).not.toContain('#forest');

    await wrapper.find('.tag-insert-item').trigger('click');

    expect(onSelect).toHaveBeenCalledWith('harbor');
    expect(onClose).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('offers creating a new tag', async () => {
    const onCreate = vi.fn();
    const wrapper = mountPopup({ query: 'new-tag', onCreate });

    const create = wrapper
      .findAll('.tag-insert-item')
      .find((item) => item.text().includes('Create #new-tag'));
    expect(create).toBeTruthy();
    await create!.trigger('click');

    expect(onCreate).toHaveBeenCalledWith('new-tag');
    wrapper.unmount();
  });

  it('hides create when the query already exists', () => {
    const wrapper = mountPopup({ query: 'harbor' });

    expect(wrapper.text()).not.toContain('Create #harbor');
    wrapper.unmount();
  });

  it('shows an empty state when there are no matches', () => {
    const wrapper = mountPopup({ tags: [], query: '' });

    expect(wrapper.text()).toContain('No tags yet');
    wrapper.unmount();
  });

  it('supports keyboard selection and escape', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const wrapper = mountPopup({ onSelect, onClose });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onSelect).toHaveBeenCalledWith('harbor');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalled();
    wrapper.unmount();
  });
});
