import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { usePageContentRect } from '@/composables/usePageContentRect';

const Probe = defineComponent({
  setup() {
    const { left, width } = usePageContentRect();
    return () =>
      h('div', { 'data-test': 'probe' }, `${left.value}:${width.value}`);
  },
});

function createPageContainer(paddingLeft: number, paddingRight = 0) {
  const element = document.createElement('div');
  element.className = 'q-page-container';
  element.style.paddingLeft = `${paddingLeft}px`;
  element.style.paddingRight = `${paddingRight}px`;
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1440,
    bottom: 900,
    width: 1440,
    height: 900,
    toJSON: () => ({}),
  });
  document.body.appendChild(element);
  return element;
}

describe('usePageContentRect', () => {
  afterEach(() => {
    document.querySelector('.q-page-container')?.remove();
  });

  it('excludes drawer padding from the page content area', async () => {
    const element = createPageContainer(300, 280);
    const wrapper = mount(Probe);
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toBe('300:860');

    element.style.paddingLeft = '57px';
    element.style.paddingRight = '0px';
    window.dispatchEvent(new Event('resize'));
    await nextTick();

    expect(wrapper.text()).toBe('57:1383');
    wrapper.unmount();
  });

  it('updates when the page container resizes', async () => {
    const element = createPageContainer(57);
    const wrapper = mount(Probe);
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toBe('57:1383');

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1100,
      bottom: 900,
      width: 1100,
      height: 900,
      toJSON: () => ({}),
    });
    window.dispatchEvent(new Event('resize'));
    await nextTick();

    expect(wrapper.text()).toBe('57:1043');
    wrapper.unmount();
  });
});
