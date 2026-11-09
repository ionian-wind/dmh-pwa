import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import PartyList from '@/parties/PartyList.vue';
import SidebarActionItem from '@/components/common/SidebarActionItem.vue';
import { usePartyStore } from '@/stores/parties';
import { useSelectedParty } from '@/parties/useSelectedParty';
import { confirm } from '@/dialogs';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));
vi.mock('@/dialogs', () => ({
  confirm: vi.fn().mockResolvedValue(true),
  alert: vi.fn().mockResolvedValue(undefined),
  prompt: vi.fn(),
}));

const PartyEditorStub = defineComponent({
  name: 'PartyEditor',
  props: {
    party: { type: Object, default: null },
    isOpen: Boolean,
  },
  emits: ['submit', 'delete', 'cancel'],
  setup() {
    return () => h('div', { 'data-stub': 'PartyEditor' });
  },
});

function mountPartyList() {
  return mount(PartyList, {
    global: {
      stubs: { PartyEditor: PartyEditorStub },
    },
  });
}

describe('PartyList', () => {
  beforeEach(() => {
    resetMockStores();
    vi.mocked(confirm).mockResolvedValue(true);
  });

  it('lists parties and switches between a party and all characters', async () => {
    seedMockStore('parties', [
      { id: 'p1', name: 'Heroes', characters: ['c1'], updatedAt: 2 },
      { id: 'p2', name: 'Villains', characters: ['c2'], updatedAt: 1 },
    ]);
    const wrapper = mountPartyList();
    await flushPromises();
    const {
      selectedPartyId,
      selectedParty,
      selectedCharacterIds,
      selectParty,
    } = useSelectedParty();

    const items = wrapper.findAllComponents(SidebarActionItem);
    expect(items.map((item) => item.props('title'))).toEqual([
      'Heroes',
      'Villains',
    ]);

    await items[1].trigger('click');
    expect(selectedPartyId.value).toBe('p2');

    selectParty('missing');
    expect(selectedParty.value).toBeNull();
    expect(selectedCharacterIds.value.size).toBe(0);

    await wrapper.find('.party-all-characters').trigger('click');
    expect(selectedPartyId.value).toBeNull();
    wrapper.unmount();
  });

  it('confirms party removal and clears the selection', async () => {
    seedMockStore('parties', [
      { id: 'p1', name: 'Heroes', characters: [], updatedAt: 1 },
    ]);
    const wrapper = mountPartyList();
    await flushPromises();
    const store = usePartyStore();
    const { selectedPartyId, selectParty } = useSelectedParty();
    selectParty('p1');

    wrapper.findComponent(SidebarActionItem).vm.$emit('remove');
    await flushPromises();

    expect(confirm).toHaveBeenCalled();
    expect(store.items).toHaveLength(0);
    expect(selectedPartyId.value).toBeNull();
    wrapper.unmount();
  });

  it('keeps the party when removal is cancelled', async () => {
    seedMockStore('parties', [
      { id: 'p1', name: 'Heroes', characters: [], updatedAt: 1 },
    ]);
    const wrapper = mountPartyList();
    await flushPromises();
    const store = usePartyStore();
    const { selectedPartyId, selectParty } = useSelectedParty();
    selectParty('p1');
    vi.mocked(confirm).mockResolvedValue(false);

    wrapper.findComponent(SidebarActionItem).vm.$emit('remove');
    await flushPromises();

    expect(confirm).toHaveBeenCalled();
    expect(store.items).toHaveLength(1);
    expect(selectedPartyId.value).toBe('p1');
    wrapper.unmount();
  });

  it('keeps another selected party when a different party is removed', async () => {
    seedMockStore('parties', [
      { id: 'p1', name: 'Heroes', characters: [], updatedAt: 2 },
      { id: 'p2', name: 'Villains', characters: [], updatedAt: 1 },
    ]);
    const wrapper = mountPartyList();
    await flushPromises();
    const store = usePartyStore();
    const { selectedPartyId, selectParty } = useSelectedParty();
    selectParty('p2');

    wrapper.findAllComponents(SidebarActionItem)[0].vm.$emit('remove');
    await flushPromises();

    expect(store.getById('p1')).toBeNull();
    expect(store.getById('p2')).not.toBeNull();
    expect(selectedPartyId.value).toBe('p2');
    wrapper.unmount();
  });

  it('deletes a party from the editor and ignores unknown ids', async () => {
    seedMockStore('parties', [
      { id: 'p1', name: 'Heroes', characters: [], updatedAt: 1 },
    ]);
    const wrapper = mountPartyList();
    await flushPromises();
    const store = usePartyStore();

    await wrapper.find('button[title="Edit"]').trigger('click');
    const editor = wrapper.findComponent(PartyEditorStub);

    editor.vm.$emit('delete', 'missing');
    await flushPromises();
    expect(store.getById('missing')).toBeNull();
    expect(wrapper.findComponent(PartyEditorStub).props('isOpen')).toBe(true);

    editor.vm.$emit('delete', 'p1');
    await flushPromises();
    expect(store.getById('p1')).toBeNull();
    expect(wrapper.findComponent(PartyEditorStub).props('isOpen')).toBe(false);
    wrapper.unmount();
  });

  it('creates a party from the sidebar editor', async () => {
    seedMockStore('parties', [
      { id: 'p1', name: 'Heroes', characters: [], updatedAt: 1 },
    ]);
    const wrapper = mountPartyList();
    await flushPromises();
    const store = usePartyStore();

    const create = wrapper
      .findAll('[data-stub="QItem"]')
      .find((item) => item.text().includes('New party'))!;
    await create.trigger('click');

    const editor = wrapper.findComponent(PartyEditorStub);
    expect(editor.props('isOpen')).toBe(true);
    expect(editor.props('party')).toBeNull();

    editor.vm.$emit('submit', { id: '', name: 'New crew', characters: [] });
    await flushPromises();

    expect(store.items.map((party) => party.name)).toContain('New crew');
    expect(wrapper.findComponent(PartyEditorStub).props('isOpen')).toBe(false);
    wrapper.unmount();
  });

  it('edits an existing party from its sidebar action', async () => {
    seedMockStore('parties', [
      { id: 'p1', name: 'Heroes', characters: [], updatedAt: 1 },
    ]);
    const wrapper = mountPartyList();
    await flushPromises();
    const store = usePartyStore();

    await wrapper.find('button[title="Edit"]').trigger('click');
    const editor = wrapper.findComponent(PartyEditorStub);
    expect(editor.props('party')).toMatchObject({ id: 'p1', name: 'Heroes' });

    editor.vm.$emit('submit', {
      id: 'p1',
      name: 'Renamed',
      characters: ['c1'],
    });
    await flushPromises();

    expect(store.getById('p1')).toMatchObject({
      name: 'Renamed',
      characters: ['c1'],
    });
    wrapper.unmount();
  });
});
