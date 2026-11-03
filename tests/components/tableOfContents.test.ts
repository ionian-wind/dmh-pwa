import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  it('renders anchor links and indentation', () => {
    const wrapper = mount(TableOfContents, {
      props: { items, activeAnchorId: 'details' },
    });

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
});

describe('TableOfContents scroll spy', () => {
  const created: HTMLElement[] = [];

  function addElement(parent: HTMLElement, id: string, top: number) {
    const element = document.createElement('div');
    element.id = id;
    element.getBoundingClientRect = () =>
      ({ top, bottom: top + 20, height: 20 }) as DOMRect;
    parent.appendChild(element);
    created.push(element);
    return element;
  }

  afterEach(() => {
    for (const element of created.splice(0)) element.remove();
    document
      .querySelectorAll('.q-page-container')
      .forEach((element) => element.remove());
  });

  it('tracks the visible section inside a scrollable container', async () => {
    const container = document.createElement('div');
    container.className = 'q-page-container';
    Object.defineProperties(container, {
      scrollHeight: { configurable: true, value: 2000 },
      clientHeight: { configurable: true, value: 500 },
    });
    document.body.appendChild(container);
    const first = addElement(container, 'first', 50);
    const second = addElement(container, 'second', 300);

    const wrapper = mount(TableOfContents, {
      props: {
        items: [
          { id: 'first', level: 2, anchorId: 'first', title: 'First' },
          { id: 'second', level: 2, anchorId: 'second', title: 'Second' },
        ],
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(wrapper.find('.toc-item.active').text()).toContain('First');

    second.getBoundingClientRect = () =>
      ({ top: 40, bottom: 60, height: 20 }) as DOMRect;
    container.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(wrapper.find('.toc-item.active').text()).toContain('Second');
    expect(first.isConnected).toBe(true);
    wrapper.unmount();
  });

  it('falls back to window scrolling', async () => {
    addElement(document.body, 'one', 60);
    const two = addElement(document.body, 'two', 400);

    const wrapper = mount(TableOfContents, {
      props: {
        items: [
          { id: 'one', level: 2, anchorId: 'one', title: 'One' },
          { id: 'two', level: 2, anchorId: 'two', title: 'Two' },
        ],
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(wrapper.find('.toc-item.active').text()).toContain('One');

    two.getBoundingClientRect = () =>
      ({ top: 60, bottom: 80, height: 20 }) as DOMRect;
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(wrapper.find('.toc-item.active').text()).toContain('Two');
    wrapper.unmount();
  });
});
