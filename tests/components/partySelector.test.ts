import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import PartySelector from '@/encounters/PartySelector.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useCombatStore } from '@/stores/combats';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: {
    kind: String,
    label: String,
    modelValue: Array,
    options: Array,
  },
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { class: 'entities-linking-stub' });
  },
});

function linkBlock(wrapper: ReturnType<typeof mount>, kind: string) {
  return wrapper
    .findAllComponents(EntitiesLinkingStub)
    .find((entry) => entry.props('kind') === kind)!;
}

const encounter = {
  id: 'e1',
  name: 'Ambush',
  monsters: { m1: 2, m2: 1 },
} as any;

async function mountSelector(overrides: Record<string, any> = {}) {
  const wrapper = mount(PartySelector, {
    props: { isOpen: true, encounter, ...overrides },
    global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
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

  it('selects a party, links characters and creates a combat', async () => {
    const wrapper = await mountSelector();
    linkBlock(wrapper, 'party').vm.$emit('update:modelValue', [
      { kind: 'party', id: 'p1' },
    ]);
    await nextTick();
    await flushPromises();

    expect(wrapper.text()).toContain('Heroes');
    expect(wrapper.text()).toContain('Ambush');
    expect(linkBlock(wrapper, 'character').props('options')).toHaveLength(2);

    linkBlock(wrapper, 'character').vm.$emit('update:modelValue', [
      { kind: 'character', id: 'c1' },
    ]);
    await nextTick();
    expect(linkBlock(wrapper, 'character').props('modelValue')).toEqual([
      { kind: 'character', id: 'c1' },
    ]);

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

  it('shows a hint when all characters are unlinked and cancels', async () => {
    const wrapper = await mountSelector();
    linkBlock(wrapper, 'party').vm.$emit('update:modelValue', [
      { kind: 'party', id: 'p1' },
    ]);
    await nextTick();

    linkBlock(wrapper, 'character').vm.$emit('update:modelValue', []);
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

    linkBlock(wrapper, 'party').vm.$emit('update:modelValue', [
      { kind: 'party', id: 'missing' },
    ]);
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('combat-created')).toBeUndefined();
    wrapper.unmount();
  });
});
