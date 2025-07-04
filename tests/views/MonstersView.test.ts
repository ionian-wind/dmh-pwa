import { mount, flushPromises } from '@vue/test-utils';
import MonstersView from '../../src/monsters/MonstersView.vue';
import { setActivePinia, createPinia } from 'pinia';
import { vi } from 'vitest';

// Mock router
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Mock MonsterCard and MonsterEditor
vi.mock('@/components/MonsterCard.vue', () => ({}));
vi.mock('@/components/MonsterEditor.vue', () => ({}));

// Mock store
vi.mock('@/stores/monsters', () => ({
  loadMonsters: vi.fn(),
  createMonster: vi.fn(),
  updateMonster: vi.fn(),
  deleteMonster: vi.fn()
}));
vi.clearAllMocks();
vi.doMock('@/stores/monsters', () => ({ loadMonsters: vi.fn() }));
window.confirm = vi.fn(() => true);

describe('MonstersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders header and create button', () => {
    const wrapper = mount(MonstersView);
    expect(wrapper.find('h1').text()).toBe('Monsters');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no monsters', async () => {
    vi.doMock('@/stores/monsters', () => ({
      useMonsterStore: () => ({
        filteredMonsters: [],
        loadMonsters: vi.fn()
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
    vi.doMock('@/stores/monsters', () => ({
      useMonsterStore: () => ({
        deleteMonster: vi.fn()
      })
    }));
    const wrapper = mount(MonstersView);
    const store = require('@/stores/monsters').useMonsterStore();
    await wrapper.findAllComponents({ name: 'MonsterCard' })[0].vm.$emit('delete', '1');
    expect(store.deleteMonster).toHaveBeenCalledWith('1');
  });
}); 
