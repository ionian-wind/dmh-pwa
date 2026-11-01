import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

import PartySelector from '@/encounters/PartySelector.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import { useCombatStore } from '@/stores/combats';
import { quasarStubs } from '../helpers/quasar-stubs';
import {
  resetMockStores,
  seedMockStore,
} from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

const QSelect = quasarStubs.QSelect;

const encounter = {
  id: 'e1',
  name: 'Ambush',
  monsters: { m1: 2, m2: 1 },
} as any;

async function mountSelector(overrides: Record<string, any> = {}) {
  const wrapper = mount(PartySelector, {
    props: { isOpen: true, encounter, ...overrides },
  });
  await flushPromises();
  return wrapper;
}

describe('PartySelector', () => {
  beforeEach(() => {
    resetMockStores();
    seedMockStore('parties', [
      { id: 'p1', name: 'Heroes', characters: ['c1', 'c2'] },
    ]);
    seedMockStore('characters', [
      { id: 'c1', name: 'Aria' },
      { id: 'c2', name: 'Borin' },
    ]);
    seedMockStore('monsters', [
      { id: 'm1', name: 'Goblin' },
      { id: 'm2', name: 'Orc' },
    ]);
    seedMockStore('combats', []);
  });

  it('selects a party, toggles characters and creates a combat', async () => {
    const wrapper = await mountSelector();
    const select = wrapper.findComponent(QSelect);
    select.vm.$emit('update:modelValue', 'p1');
    await nextTick();

    expect(wrapper.text()).toContain('Heroes');
    expect(wrapper.text()).toContain('Ambush');

    const toggles = wrapper.findAllComponents(ToggleSwitch);
    expect(toggles).toHaveLength(2);
    await toggles[1].vm.$emit('update:modelValue', false);
    await nextTick();

    const combatStore = useCombatStore();
    const create = vi.spyOn(combatStore, 'create');
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        encounterId: 'e1',
        partyId: 'p1',
        status: 'preparing',
        combatants: expect.arrayContaining([
          expect.objectContaining({ type: 'player', referenceId: 'c1' }),
          expect.objectContaining({ type: 'monster', referenceId: 'm1' }),
          expect.objectContaining({ type: 'monster', referenceId: 'm2' }),
        ]),
      }),
    );
    expect(wrapper.emitted('combat-created')).toHaveLength(1);
    expect(create.mock.calls[0][0].combatants).toHaveLength(4);
    wrapper.unmount();
  });

  it('shows a hint when all characters are deselected and cancels', async () => {
    const wrapper = await mountSelector();
    wrapper.findComponent(QSelect).vm.$emit('update:modelValue', 'p1');
    await nextTick();

    const toggles = wrapper.findAllComponents(ToggleSwitch);
    await toggles[0].vm.$emit('update:modelValue', false);
    await toggles[1].vm.$emit('update:modelValue', false);
    await nextTick();
    expect(wrapper.text()).toContain('Select at least one character');

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('combat-created')).toBeUndefined();

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    await nextTick();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });

  it('ignores creation without an encounter, party or known party', async () => {
    const withoutEncounter = await mountSelector({ encounter: null });
    withoutEncounter.findComponent(BaseModal).vm.$emit('submit');
    expect(withoutEncounter.emitted('combat-created')).toBeUndefined();
    withoutEncounter.unmount();

    const wrapper = await mountSelector();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    expect(wrapper.emitted('combat-created')).toBeUndefined();

    wrapper.findComponent(QSelect).vm.$emit('update:modelValue', 'missing');
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('combat-created')).toBeUndefined();
    wrapper.unmount();
  });
});
