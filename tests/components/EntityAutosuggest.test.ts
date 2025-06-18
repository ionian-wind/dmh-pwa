import { mount } from '@vue/test-utils';
import EntityAutosuggest from '@/components/EntityAutosuggest.vue';

jest.mock('@/stores/notes', () => ({ useNoteStore: () => ({ filteredNotes: [{ id: 'n1', title: 'Note One' }] }) }));
jest.mock('@/stores/modules', () => ({ useModuleStore: () => ({ modules: [{ id: 'm1', name: 'Module One' }] }) }));
jest.mock('@/stores/parties', () => ({ usePartyStore: () => ({ filteredParties: [{ id: 'p1', name: 'Party One' }] }) }));
jest.mock('@/stores/monsters', () => ({ useMonsterStore: () => ({ filteredMonsters: [{ id: 'mo1', name: 'Goblin' }] }) }));
jest.mock('@/stores/encounters', () => ({ useEncounterStore: () => ({ filteredEncounters: [{ id: 'e1', name: 'Encounter One' }] }) }));

describe('EntityAutosuggest', () => {
  const baseProps = { position: { top: 0, left: 0 }, text: '[[note:', cursorPosition: 7 };

  it('renders suggestions for notes', () => {
    const wrapper = mount(EntityAutosuggest, { props: baseProps });
    expect(wrapper.text()).toContain('Note One');
  });

  it('emits select when suggestion is clicked', async () => {
    const wrapper = mount(EntityAutosuggest, { props: baseProps });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')[0][0]).toContain('[[note:n1]]');
  });

  it('emits cancel on Escape key', async () => {
    const wrapper = mount(EntityAutosuggest, { props: baseProps });
    await wrapper.vm.handleKeydown({ key: 'Escape', preventDefault: jest.fn() });
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('navigates suggestions with ArrowDown/ArrowUp', async () => {
    const wrapper = mount(EntityAutosuggest, { props: baseProps });
    await wrapper.vm.handleKeydown({ key: 'ArrowDown', preventDefault: jest.fn() });
    expect(wrapper.vm.selectedIndex).toBe(0);
    await wrapper.vm.handleKeydown({ key: 'ArrowUp', preventDefault: jest.fn() });
    expect(wrapper.vm.selectedIndex).toBe(wrapper.vm.suggestions.length - 1);
  });
}); 