import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import MarkdownHelpDialog from '@/components/common/MarkdownHelpDialog.vue';
import BaseModal from '@/components/common/BaseModal.vue';

describe('MarkdownHelpDialog', () => {
  it('renders markdown and internal-link help', () => {
    const wrapper = mount(MarkdownHelpDialog, {
      props: { isOpen: true },
    });

    expect(wrapper.text()).toContain('Formatting Help');
    expect(wrapper.text()).toContain('Internal Links');
    expect(wrapper.text()).toContain('[title](type://id)');
    expect(wrapper.text()).toContain('Entity Mentions');
    expect(wrapper.text()).toContain('[Tavern](note://123)');
    expect(wrapper.text()).toContain('Tags');
    expect(wrapper.text()).toContain('#tavern');
    expect(wrapper.text()).toContain('# Heading');
    wrapper.unmount();
  });

  it('forwards close events', async () => {
    const wrapper = mount(MarkdownHelpDialog, {
      props: { isOpen: true },
    });

    const modal = wrapper.findComponent(BaseModal);
    modal.vm.$emit('cancel');
    modal.vm.$emit('update:isOpen', false);

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('update:isOpen')?.[0]).toEqual([false]);
    wrapper.unmount();
  });
});
