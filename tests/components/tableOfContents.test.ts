import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TableOfContents from '@/components/common/TableOfContents.vue';

const items = [
  { id: 'intro', level: 2, anchorId: 'intro', title: 'Introduction' },
  { id: 'details', level: 3, anchorId: 'details', title: 'Details' },
];

describe('TableOfContents', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/');
  });

  it('renders anchor links, title and indentation', () => {
    const wrapper = mount(TableOfContents, {
      props: { items, title: 'On this page', activeAnchorId: 'details' },
    });

    expect(wrapper.find('.toc-title').text()).toBe('On this page');
    const links = wrapper.findAll('a.toc-link');
    expect(links).toHaveLength(2);
    expect(links[0].attributes('href')).toBe('#intro');
    expect(links[1].attributes('href')).toBe('#details');
    expect(wrapper.findAll('.toc-item')[1].classes()).toContain('toc-level-3');
    expect(wrapper.findAll('.toc-item')[1].classes()).toContain('active');
    wrapper.unmount();
  });

  it('emits the anchor and updates the URL hash on click', async () => {
    const wrapper = mount(TableOfContents, { props: { items } });

    await wrapper.findAll('a.toc-link')[1].trigger('click');

    expect(wrapper.emitted('item-click')?.[0]).toEqual(['details']);
    expect(window.location.hash).toBe('#details');
    wrapper.unmount();
  });

  it('omits the title block when no title is provided', () => {
    const wrapper = mount(TableOfContents, { props: { items } });
    expect(wrapper.find('.toc-title').exists()).toBe(false);
    wrapper.unmount();
  });
});
