import { mount } from '@vue/test-utils';
import CombatTracker from '@/components/CombatTracker.vue';
import { vi } from 'vitest';

vi.mock('@/stores/combats', () => ({
  useCombatStore: () => ({
    getCombatByEncounter: vi.fn(() => ({
      id: 'c1',
      encounterId: 'e1',
      partyId: 'p1',
      status: 'active',
      currentRound: 1,
      currentTurn: 0,
      combatants: [
        { id: 'cb1', name: 'Alice', type: 'player', initiative: 10, hitPoints: { maximum: 10, current: 10, temporary: 0 }, conditions: [], referenceId: 'char1', notes: '', createdAt: 0, updatedAt: 0 },
        { id: 'cb2', name: 'Goblin', type: 'monster', initiative: 8, hitPoints: { maximum: 7, current: 7, temporary: 0 }, conditions: [], referenceId: 'm1', notes: '', createdAt: 0, updatedAt: 0 }
      ]
    })),
    nextTurn: vi.fn(),
    previousTurn: vi.fn(),
    endCombat: vi.fn(),
    updateCombatant: vi.fn(),
    addCombatant: vi.fn(),
    removeCombatant: vi.fn()
  })
}));
vi.mock('@/stores/encounters', () => ({ useEncounterStore: () => ({ encounters: [{ id: 'e1', name: 'Encounter', monsters: {}, moduleId: 'mod-1' }] }) }));
vi.mock('@/stores/parties', () => ({ usePartyStore: () => ({ parties: [{ id: 'p1', name: 'Party', characters: ['char1'] }] }) }));
vi.mock('@/stores/monsters', () => ({ useMonsterStore: () => ({ monsters: [{ id: 'm1', name: 'Goblin', hitPoints: 7, armorClass: 13 }] }) }));

describe('CombatTracker', () => {
  const baseProps = { encounterId: 'e1' };

  it('renders combatant names and controls', () => {
    const wrapper = mount(CombatTracker, { props: baseProps });
    expect(wrapper.text()).toContain('Alice');
    expect(wrapper.text()).toContain('Goblin');
  });

  it('calls nextTurn and previousTurn', async () => {
    const wrapper = mount(CombatTracker, { props: baseProps });
    await wrapper.vm.nextTurn();
    await wrapper.vm.previousTurn();
    const store = require('@/stores/combats').useCombatStore();
    expect(store.nextTurn).toHaveBeenCalled();
    expect(store.previousTurn).toHaveBeenCalled();
  });

  it('calls endCombat', async () => {
    const wrapper = mount(CombatTracker, { props: baseProps });
    await wrapper.vm.endCombat();
    const store = require('@/stores/combats').useCombatStore();
    expect(store.endCombat).toHaveBeenCalled();
  });

  it('updates hit points', async () => {
    const wrapper = mount(CombatTracker, { props: baseProps });
    await wrapper.vm.updateHitPoints('cb1', -5);
    const store = require('@/stores/combats').useCombatStore();
    expect(store.updateCombatant).toHaveBeenCalled();
  });

  it('adds and removes conditions', async () => {
    const wrapper = mount(CombatTracker, { props: baseProps });
    await wrapper.vm.addCondition('cb1', 'stunned');
    await wrapper.vm.removeCondition('cb1', 'stunned');
    const store = require('@/stores/combats').useCombatStore();
    expect(store.updateCombatant).toHaveBeenCalled();
  });

  it('toggles autoAdvance and clears log', async () => {
    const wrapper = mount(CombatTracker, { props: baseProps });
    wrapper.vm.toggleAutoAdvance();
    expect(wrapper.vm.autoAdvance).toBe(true);
    wrapper.vm.clearLog();
    expect(wrapper.vm.combatLog.length).toBe(0);
  });
}); 