import { mount } from '@vue/test-utils';
import PartyCard from '../../src/parties/PartyCard.vue';
import { vi } from 'vitest';

vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({ modules: [
    { id: 'mod-1', name: 'Module One' },
    { id: 'mod-2', name: 'Module Two' }
  ] })
}));

const mockParty = {
  id: 'party-1',
  name: 'Adventurers',
  description: 'A brave party.',
  characters: ['char-1', 'char-2'],
  moduleIds: ['mod-1', 'mod-2'],
  createdAt: 0,
  updatedAt: 0
};

describe('PartyCard', () => {
  it('renders party name and description', () => {
    const wrapper = mount(PartyCard, { props: { party: mockParty } });
    expect(wrapper.text()).toContain('Adventurers');
    expect(wrapper.text()).toContain('A brave party.');
  });

  it('renders character count', () => {
    const wrapper = mount(PartyCard, { props: { party: mockParty } });
    expect(wrapper.text()).toContain('2 characters');
  });

  it('renders module names', () => {
    const wrapper = mount(PartyCard, { props: { party: mockParty } });
    expect(wrapper.text()).toContain('Module One');
    expect(wrapper.text()).toContain('Module Two');
  });

  it('emits view, edit, and delete events', async () => {
    const wrapper = mount(PartyCard, { props: { party: mockParty } });
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('view');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('edit');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('delete');
    expect(wrapper.emitted('view')).toBeTruthy();
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('view')[0][0]).toEqual(mockParty);
    expect(wrapper.emitted('edit')[0][0]).toEqual(mockParty);
    expect(wrapper.emitted('delete')[0][0]).toEqual(mockParty);
  });
}); 
