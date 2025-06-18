import { mount, flushPromises } from '@vue/test-utils';
import MonstersView from '@/views/MonstersView.vue';
import { setActivePinia, createPinia } from 'pinia';

// Mock router
jest.mock('vue-router', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

// Mock MonsterCard and MonsterEditor
jest.mock('@/components/MonsterCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'MonsterCard',
    props: ['monster', 'showActions'],
    emits: ['view', 'edit', 'delete', 'add-to-encounter'],
    template: '<div class="monster-card">MonsterCard</div>'
  }
}));
jest.mock('@/components/MonsterEditor.vue', () => ({
  __esModule: true,
  default: {
    name: 'MonsterEditor',
    props: ['monster', 'isOpen'],
    emits: ['submit', 'cancel'],
    template: '<div class="monster-editor">MonsterEditor</div>'
  }
}));

// Mock store
jest.mock('@/stores/monsters', () => {
  const monsters = [
    { id: '1', name: 'Goblin', type: 'humanoid', size: 'small', alignment: 'chaotic evil', armorClass: 15, hitPoints: 7, speed: {}, abilities: {}, senses: [], languages: [], challengeRating: 1, xp: 200, actions: [], moduleId: 'mod1', createdAt: 0, updatedAt: 0 },
    { id: '2', name: 'Orc', type: 'humanoid', size: 'medium', alignment: 'chaotic evil', armorClass: 13, hitPoints: 15, speed: {}, abilities: {}, senses: [], languages: [], challengeRating: 2, xp: 450, actions: [], moduleId: 'mod1', createdAt: 0, updatedAt: 0 }
  ];
  return {
    useMonsterStore: () => ({
      filteredMonsters: monsters,
      loadMonsters: jest.fn(),
      getMonsterById: (id: string) => monsters.find(m => m.id === id),
      createMonster: jest.fn(),
      updateMonster: jest.fn(),
      deleteMonster: jest.fn()
    })
  };
});

describe('MonstersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
  });

  it('renders header and create button', () => {
    const wrapper = mount(MonstersView);
    expect(wrapper.find('h1').text()).toBe('Monsters');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no monsters', async () => {
    jest.doMock('@/stores/monsters', () => ({
      useMonsterStore: () => ({
        filteredMonsters: [],
        loadMonsters: jest.fn()
      })
    }));
    const wrapper = mount(MonstersView);
    await flushPromises();
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No monsters yet');
  });

  it('shows monsters grid if monsters exist', () => {
    const wrapper = mount(MonstersView);
    expect(wrapper.find('.monsters-grid').exists()).toBe(true);
    expect(wrapper.findAll('.monster-card').length).toBeGreaterThan(0);
  });

  it('opens editor when create button is clicked', async () => {
    const wrapper = mount(MonstersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    expect(wrapper.findComponent({ name: 'MonsterEditor' }).exists()).toBe(true);
  });

  it('opens editor when edit is emitted from MonsterCard', async () => {
    const wrapper = mount(MonstersView);
    await wrapper.findAllComponents({ name: 'MonsterCard' })[0].vm.$emit('edit', { id: '1' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'MonsterEditor' }).exists()).toBe(true);
  });

  it('closes editor on cancel', async () => {
    const wrapper = mount(MonstersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    await wrapper.findComponent({ name: 'MonsterEditor' }).vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'MonsterEditor' }).exists()).toBe(false);
  });

  it('calls store createMonster on submit if no id', async () => {
    const wrapper = mount(MonstersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/monsters').useMonsterStore();
    await wrapper.findComponent({ name: 'MonsterEditor' }).vm.$emit('submit', { name: 'New', id: undefined });
    expect(store.createMonster).toHaveBeenCalled();
  });

  it('calls store updateMonster on submit if id exists', async () => {
    const wrapper = mount(MonstersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/monsters').useMonsterStore();
    await wrapper.findComponent({ name: 'MonsterEditor' }).vm.$emit('submit', { name: 'Edit', id: '1' });
    expect(store.updateMonster).toHaveBeenCalled();
  });

  it('calls store deleteMonster on delete event', async () => {
    window.confirm = jest.fn(() => true);
    const wrapper = mount(MonstersView);
    const store = require('@/stores/monsters').useMonsterStore();
    await wrapper.findAllComponents({ name: 'MonsterCard' })[0].vm.$emit('delete', '1');
    expect(store.deleteMonster).toHaveBeenCalledWith('1');
  });
}); 