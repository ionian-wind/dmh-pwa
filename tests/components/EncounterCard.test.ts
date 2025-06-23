import { mount } from '@vue/test-utils';
import EncounterCard from '@/components/EncounterCard.vue';
import { vi } from 'vitest';

vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({ modules: [
    { id: 'mod-1', name: 'Module One' }
  ] })
}));

describe('EncounterCard', () => {
  const encounter = {
    id: 'e1',
    name: 'Test Encounter',
    description: 'desc',
    level: 3,
    difficulty: 'Medium',
    xp: 200,
    moduleId: 'mod-1',
    monsters: { m1: 2, m2: 3 },
    currentRound: 1,
    currentTurn: 0,
    createdAt: 0,
    updatedAt: 0
  };

  it('renders encounter name, description, and meta', () => {
    const wrapper = mount(EncounterCard, { props: { encounter } });
    expect(wrapper.text()).toContain('Test Encounter');
    expect(wrapper.text()).toContain('desc');
    expect(wrapper.text()).toContain('Level:');
    expect(wrapper.text()).toContain('Medium');
    expect(wrapper.text()).toContain('200');
  });

  it('shows module name from store', () => {
    const wrapper = mount(EncounterCard, { props: { encounter } });
    expect(wrapper.text()).toContain('Module One');
  });

  it('shows monsters count summary', () => {
    const wrapper = mount(EncounterCard, { props: { encounter } });
    expect(wrapper.text()).toContain('Monsters:');
    expect(wrapper.text()).toContain('2 (5)');
  });

  it('emits view, edit, delete, and run-combat events', async () => {
    const wrapper = mount(EncounterCard, { props: { encounter } });
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('view');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('edit');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('delete');
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    expect(wrapper.emitted('view')).toBeTruthy();
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('run-combat')).toBeTruthy();
    expect(wrapper.emitted('view')[0][0]).toEqual(encounter);
    expect(wrapper.emitted('edit')[0][0]).toEqual(encounter);
    expect(wrapper.emitted('delete')[0][0]).toEqual(encounter);
    expect(wrapper.emitted('run-combat')[0][0]).toEqual(encounter);
  });
}); 