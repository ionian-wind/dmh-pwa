import { mount, flushPromises } from '@vue/test-utils';
import PartySelector from '@/components/PartySelector.vue';
import { vi } from 'vitest';

vi.mock('@/stores/parties', () => ({ usePartyStore: () => ({
  loadParties: vi.fn(),
  filteredParties: [ { id: 'p1', name: 'Party 1', characters: [1,2], moduleIds: [] } ],
  getPartyById: vi.fn(() => ({ id: 'p1', name: 'Party 1', characters: [1,2], moduleIds: [] }))
}) }));
vi.mock('@/stores/combats', () => ({ useCombatStore: () => ({ createCombat: vi.fn((c) => ({ ...c, id: 'c1' })) }) }));
vi.mock('@/stores/encounters', () => ({ useEncounterStore: () => ({}) }));
vi.mock('@/stores/monsters', () => ({ useMonsterStore: () => ({ loadMonsters: vi.fn(), monsters: [ { id: 'm1', name: 'Goblin', hitPoints: 7, armorClass: 13 } ] }) }));
vi.mock('@/stores/characters', () => ({ useCharacterStore: () => ({ all: [ { id: 'char1', name: 'Alice', partyId: 'p1', initiative: 2, armorClass: 15, hitPoints: { maximum: 10, current: 10 } } ] }) }));

describe('PartySelector', () => {
  const baseProps = { isOpen: true, encounter: { id: 'e1', name: 'Test Encounter', monsters: { m1: 1 }, difficulty: 'Easy', level: 1, xp: 100 } };

  it('renders modal and party options', async () => {
    const wrapper = mount(PartySelector, { props: baseProps });
    await flushPromises();
    expect(wrapper.text()).toContain('Start Combat');
    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.findAll('option').length).toBeGreaterThan(1);
  });

  it('shows party info when party is selected', async () => {
    const wrapper = mount(PartySelector, { props: baseProps });
    await wrapper.find('select').setValue('p1');
    await flushPromises();
    expect(wrapper.text()).toContain('Party 1');
    expect(wrapper.text()).toContain('Characters: 1');
  });

  it('emits cancel when cancel is clicked', async () => {
    const wrapper = mount(PartySelector, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('emits combat-created when submit is triggered', async () => {
    const wrapper = mount(PartySelector, { props: baseProps });
    await wrapper.find('select').setValue('p1');
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('combat-created')).toBeTruthy();
    expect(wrapper.emitted('combat-created')[0][0].id).toBe('c1');
  });

  it('shows alert if no party selected on submit', async () => {
    window.alert = vi.fn();
    const wrapper = mount(PartySelector, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(window.alert).toHaveBeenCalledWith('Please select a party');
    expect(wrapper.emitted('combat-created')).toBeFalsy();
  });
}); 