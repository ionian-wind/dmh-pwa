import { mount, flushPromises } from '@vue/test-utils';
import CharactersView from '@/views/CharactersView.vue';
import { setActivePinia, createPinia } from 'pinia';
import { vi } from 'vitest';

// Mock router
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Mock CharacterCard and CharacterEditor
vi.mock('@/components/CharacterCard.vue', () => ({}));
vi.mock('@/components/CharacterEditor.vue', () => ({}));

// Mock store
vi.mock('@/stores/characters', () => ({
  useCharacterStore: () => ({
    all: [],
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  })
}));
vi.mock('@/stores/parties', () => ({ usePartyStore: () => ({ loadParties: vi.fn() }) }));
vi.mock('@/stores/modules', () => ({ useModuleStore: () => ({ loadModules: vi.fn() }) }));

describe('CharactersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders header and create button', () => {
    const wrapper = mount(CharactersView);
    expect(wrapper.find('h1').text()).toBe('Characters');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no characters', async () => {
    vi.doMock('@/stores/characters', () => ({
      useCharacterStore: () => ({ all: [], add: vi.fn(), update: vi.fn(), remove: vi.fn() })
    }));
    const wrapper = mount(CharactersView);
    await flushPromises();
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No characters yet');
  });

  it('shows characters grid if characters exist', () => {
    const wrapper = mount(CharactersView);
    expect(wrapper.find('.characters-grid').exists()).toBe(true);
    expect(wrapper.findAll('.character-card').length).toBeGreaterThan(0);
  });

  it('opens editor when create button is clicked', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    expect(wrapper.findComponent({ name: 'CharacterEditor' }).exists()).toBe(true);
  });

  it('opens editor when edit is emitted from CharacterCard', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findAllComponents({ name: 'CharacterCard' })[0].vm.$emit('edit', { id: '1' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'CharacterEditor' }).exists()).toBe(true);
  });

  it('closes editor on cancel', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    await wrapper.findComponent({ name: 'CharacterEditor' }).vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'CharacterEditor' }).exists()).toBe(false);
  });

  it('calls store add on submit if no id', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/characters').useCharacterStore();
    await wrapper.findComponent({ name: 'CharacterEditor' }).vm.$emit('submit', { name: 'New', id: undefined });
    expect(store.add).toHaveBeenCalled();
  });

  it('calls store update on submit if id exists', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/characters').useCharacterStore();
    await wrapper.findComponent({ name: 'CharacterEditor' }).vm.$emit('submit', { name: 'Edit', id: '1' });
    expect(store.update).toHaveBeenCalled();
  });

  it('calls store remove on delete event', async () => {
    vi.fn(() => true);
    const wrapper = mount(CharactersView);
    const store = require('@/stores/characters').useCharacterStore();
    await wrapper.findAllComponents({ name: 'CharacterCard' })[0].vm.$emit('delete', { id: '1', name: 'Alice' });
    expect(store.remove).toHaveBeenCalledWith('1');
  });
}); 