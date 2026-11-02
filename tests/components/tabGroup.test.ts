import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TabGroup from '@/components/common/TabGroup.vue';

describe('TabGroup', () => {
  it('translates keys but leaves already-translated labels intact', () => {
    const wrapper = mount(TabGroup, {
      props: {
        tabs: [
          { id: 'toc', label: 'common.tableOfContents' },
          { id: 'bookmarks', label: 'Оглавление' },
        ],
      },
    });

    const labels = wrapper.findAll('.tab-label').map((label) => label.text());
    expect(labels[0]).toBe('Table of Contents');
    expect(labels[1]).toBe('Оглавление');
    wrapper.unmount();
  });
});
