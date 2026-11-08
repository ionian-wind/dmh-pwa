import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const combat = {
  id: 'combat-1',
  encounterId: 'enc-1',
  partyId: 'party-1',
  status: 'active',
  currentRound: 1,
  currentTurn: 0,
  combatants: [
    {
      id: 'c1',
      type: 'player',
      referenceId: 'char-1',
      notes: '',
      initiative: 5,
      hasActed: false,
      isPostponed: false,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'm1',
      type: 'pawn',
      referenceId: 'pawn-1',
      notes: '',
      initiative: 2,
      hasActed: false,
      isPostponed: false,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

const mocks = vi.hoisted(() => ({
  route: { name: '', params: {} as Record<string, string> },
  combats: {
    items: [] as any[],
    isLoaded: true,
    load: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
    removeCombatant: vi.fn(),
    endCombat: vi.fn().mockResolvedValue(undefined),
  },
  encounters: {
    isLoaded: true,
    load: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn((id: string) =>
      id === 'enc-1' ? { id, name: 'Ambush' } : null,
    ),
  },
  characters: {
    isLoaded: true,
    load: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn((id: string) =>
      id === 'char-1' ? { id, name: 'Aria' } : null,
    ),
  },
  pawns: {
    isLoaded: true,
    load: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn((id: string) =>
      id === 'pawn-1' ? { id, name: 'Goblin' } : null,
    ),
  },
}));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRoute: () => mocks.route,
}));

vi.mock('@/stores/combats', () => ({ useCombatStore: () => mocks.combats }));
vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => mocks.encounters,
}));
vi.mock('@/stores/characters', () => ({
  useCharacterStore: () => mocks.characters,
}));
vi.mock('@/stores/pawns', () => ({ usePawnStore: () => mocks.pawns }));

import ActiveCombatsPanel from '@/encounters/ActiveCombatsPanel.vue';
import ActiveCombatButton from '@/encounters/ActiveCombatButton.vue';

describe('active combats sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.route.name = '';
    mocks.route.params = {};
    mocks.combats.items = reactive([structuredClone(combat)]);
    mocks.combats.update.mockImplementation(
      async (_id: string, patch: Record<string, unknown>) => ({
        ...mocks.combats.items[0],
        ...patch,
      }),
    );
    mocks.combats.removeCombatant.mockImplementation(
      async (_id: string, combatantId: string) => ({
        ...mocks.combats.items[0],
        combatants: mocks.combats.items[0].combatants.filter(
          (entry: any) => entry.id !== combatantId,
        ),
      }),
    );
  });

  it('shows combat groups with participant actions', async () => {
    const wrapper = mount(ActiveCombatsPanel);
    await flushPromises();

    expect(wrapper.text()).toContain('Ambush');
    expect(wrapper.text()).toContain('Aria');
    expect(wrapper.text()).toContain('Goblin');
    expect(wrapper.find('.finish-combat-button').exists()).toBe(true);
    expect(wrapper.find('.view-combat-button').exists()).toBe(true);
    expect(wrapper.findAll('.exclude-participant-button')).toHaveLength(2);
    expect(wrapper.findAll('.postpone-turn-button')).toHaveLength(1);

    await wrapper.find('.postpone-turn-button').trigger('click');
    expect(mocks.combats.update).toHaveBeenCalledWith(
      'combat-1',
      expect.objectContaining({ currentTurn: 1 }),
    );

    await wrapper.find('.finish-combat-button').trigger('click');
    expect(mocks.combats.endCombat).toHaveBeenCalledWith('combat-1');
    wrapper.unmount();
  });

  it('advances the turn and excludes participants', async () => {
    const wrapper = mount(ActiveCombatsPanel);
    await flushPromises();

    const next = wrapper.find('.combat-participant-actions button');
    await next.trigger('click');
    expect(mocks.combats.update).toHaveBeenCalledWith(
      'combat-1',
      expect.objectContaining({ currentTurn: expect.any(Number) }),
    );

    await wrapper.findAll('.exclude-participant-button')[0].trigger('click');
    expect(mocks.combats.removeCombatant).toHaveBeenCalledWith(
      'combat-1',
      'c1',
    );
    wrapper.unmount();
  });

  it('hides the combat whose page is currently open', async () => {
    mocks.route.name = 'combat-detail';
    mocks.route.params = { id: 'combat-1' };

    const button = mount(ActiveCombatButton);
    await flushPromises();
    expect(button.find('.active-combats-button').exists()).toBe(false);

    const panel = mount(ActiveCombatsPanel);
    await flushPromises();
    expect(panel.text()).toContain('No active combats');
    button.unmount();
    panel.unmount();
  });

  it('shows an activate action for postponed participants', async () => {
    mocks.combats.items[0].combatants[1].isPostponed = true;
    const wrapper = mount(ActiveCombatsPanel);
    await flushPromises();

    const activate = wrapper.find('.activate-participant-button');
    expect(activate.exists()).toBe(true);
    await activate.trigger('click');
    expect(mocks.combats.update).toHaveBeenCalledWith(
      'combat-1',
      expect.objectContaining({ currentTurn: 1 }),
    );
    wrapper.unmount();
  });

  it('hides the panel when there are no active combats left', async () => {
    const wrapper = mount(ActiveCombatButton);
    await flushPromises();
    await wrapper.find('.active-combats-button').trigger('click');
    expect(wrapper.find('.active-combats-floating').exists()).toBe(true);

    mocks.combats.items.splice(0);
    await nextTick();
    expect(wrapper.find('.active-combats-floating').exists()).toBe(false);
    wrapper.unmount();
  });

  it('toggles the floating combat panel from the header button', async () => {
    const wrapper = mount(ActiveCombatButton);
    await flushPromises();

    const button = wrapper.find('.active-combats-button');
    expect(button.exists()).toBe(true);
    expect(wrapper.find('.active-combats-floating').exists()).toBe(false);

    await button.trigger('click');
    await flushPromises();
    expect(wrapper.find('.active-combats-floating').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ambush');

    await button.trigger('click');
    expect(wrapper.find('.active-combats-floating').exists()).toBe(false);

    mocks.combats.items = [];
    wrapper.unmount();
  });
});
