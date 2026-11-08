import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import AmbienceItem from '@/ambient-sound/components/AmbienceItem.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const ambience = {
  id: 'rain',
  name: 'Rain',
  icon: 'fa-solid:cloud-rain',
  category: 'Weather',
  defaultVolume: 40,
  loop: true,
  variations: [
    { id: 'light', name: 'Light rain', samples: ['light-1.mp3'] },
    {
      id: 'heavy',
      name: 'Heavy rain',
      samples: ['heavy-1.mp3', 'heavy-2.mp3', 'heavy-3.mp3'],
    },
  ],
};

function mountItem(props: Record<string, unknown> = {}) {
  return mount(AmbienceItem, {
    props: { ambience, variationId: 'heavy', ...props },
    global: { stubs: quasarStubs },
  });
}

describe('AmbienceItem', () => {
  it('shows the ambience name without category or file names', () => {
    const wrapper = mountItem();

    expect(wrapper.text()).toContain('Rain');
    expect(wrapper.text()).not.toContain('Weather');
    expect(wrapper.text()).not.toContain('.mp3');
    wrapper.unmount();
  });

  it('enumerates samples as roman numerals', () => {
    const wrapper = mountItem();

    const buttons = wrapper.findAll('button');
    expect(buttons.map((button) => button.text())).toEqual(['I', 'II', 'III']);
    wrapper.unmount();
  });

  it('emits the variation and sample index on click', async () => {
    const wrapper = mountItem();

    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('select-sample')).toEqual([['heavy', 1]]);
    wrapper.unmount();
  });

  it('marks the active sample and card', () => {
    const wrapper = mountItem({
      activeVariationId: 'heavy',
      activeSampleIndex: 2,
    });

    expect(wrapper.classes()).toContain('is-active');
    const buttons = wrapper.findAll('button');
    expect(buttons[2].classes()).toContain('sample-active');
    expect(buttons[0].classes()).not.toContain('sample-active');
    wrapper.unmount();
  });

  it('disables samples and hides rows without the selected variation', () => {
    const disabled = mountItem({ disabled: true });
    expect(disabled.findAll('button')[0].attributes('disabled')).toBeDefined();
    disabled.unmount();

    const empty = mountItem({ variationId: 'missing' });
    expect(empty.findAll('button')).toHaveLength(0);
    empty.unmount();
  });
});
