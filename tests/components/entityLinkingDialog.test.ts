import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import EntityLinkingDialog from '@/components/common/EntityLinkingDialog.vue';

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(EntityLinkingDialog, {
    props: {
      isOpen: true,
      kind: 'note',
      title: 'Link',
      options: [{ id: 'a', label: 'Alpha' }],
      linkedIds: [],
      ...props,
    },
  });
}

describe('EntityLinkingDialog', () => {
  it('shows the create action for creatable kinds by default', () => {
    const wrapper = mountDialog();
    expect(wrapper.find('button[aria-label="Create"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('hides the create action when it is disabled', () => {
    const wrapper = mountDialog({ allowCreate: false });
    expect(wrapper.find('button[aria-label="Create"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('emits refs for a custom link kind', async () => {
    const wrapper = mountDialog({ kind: 'scene' });
    await wrapper.find('.entity-option').trigger('click');
    const add = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add');
    await add!.trigger('click');

    expect(wrapper.emitted('add')?.[0]?.[0]).toMatchObject({
      refs: [{ kind: 'scene', id: 'a' }],
    });
    wrapper.unmount();
  });
});
