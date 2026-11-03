import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import EntityLinkList from '@/maps/components/EntityLinkList.vue';

describe('EntityLinkList', () => {
  it('renders known and unknown links and emits removals', async () => {
    const links = [
      { kind: 'note', id: 'n1' },
      { kind: 'unknown', id: 'x1' },
    ] as any;
    const wrapper = mount(EntityLinkList, {
      props: { links, removable: true },
    });

    expect(wrapper.text()).toContain('n1');
    expect(wrapper.text()).toContain('x1');
    expect(wrapper.text()).toContain('Notes');
    expect(wrapper.text()).toContain('Notes');

    const removeButtons = wrapper.findAll('.entity-link-remove');
    expect(removeButtons).toHaveLength(2);
    await removeButtons[1].trigger('click');
    expect(wrapper.emitted('remove')?.[0]).toEqual([links[1]]);
    wrapper.unmount();
  });

  it('hides remove buttons when not removable', () => {
    const wrapper = mount(EntityLinkList, {
      props: { links: [{ kind: 'note', id: 'n1' }] as any },
    });
    expect(wrapper.find('.entity-link-remove').exists()).toBe(false);
    wrapper.unmount();
  });
});
