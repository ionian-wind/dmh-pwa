import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Party, PlayerCharacter } from '@/types';
import { generateId, useStorage, migrateStorageData, migratePartyData } from '@/utils/storage';
import partySchema from "@/schemas/party.schema.json";
import { registerValidationSchema } from "@/utils/schemaValidator";
import { useModuleStore } from '@/stores/modules';
import { extractMentionedEntities } from '@/utils/markdownParser';
import { createBaseStore, type StandardizedStore } from './createBaseStore';

registerValidationSchema('party', partySchema);

const baseStore = createBaseStore<Party>({
  storageKey: 'dnd-parties',
  schema: 'party'
});

export const usePartyStore = defineStore('parties', (): StandardizedStore<Party> => {
  const base = baseStore();
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');
  
  // Character storage (legacy - should be moved to character store)
  const [characters, charactersLoaded] = useStorage<PlayerCharacter[]>({
    key: 'dnd-characters',
    defaultValue: [],
    schema: 'character'
  });

  // Computed
  const current = computed(() => {
    if (!currentId.value) return null;
    return base.getById(currentId.value) || null;
  });

  const filtered = computed(() => {
    const moduleStore = useModuleStore();
    return base.items.value.filter(party => moduleStore.matchesModuleFilterMultiple(party.moduleIds));
  });

  // Extended CRUD operations with standardized names
  const create = async (party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newParty = await base.create(party);
    return newParty;
  };

  const update = async (id: string, party: Partial<Omit<Party, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updatedParty = await base.update(id, party);
    return updatedParty;
  };

  const remove = async (id: string) => {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
  };

  const load = async () => {
    // Run migration first if data exists but validation fails
    try {
      const migratedData = await migrateStorageData('dnd-parties', migratePartyData, []);
      if (migratedData.length > 0 && base.items.value.length === 0) {
        // Only update if we have migrated data and no current data
        base.items.value = migratedData;
        console.log(`[Parties] Migrated ${migratedData.length} parties`);
      }
    } catch (e) {
      console.warn('[Parties] Migration failed:', e);
    }
    
    // Then load normally
    return base.load();
  };

  // Character helpers (legacy - should be moved to character store)
  const addCharacter = (character: Omit<PlayerCharacter, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCharacter: PlayerCharacter = {
      ...character,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    characters.value.push(newCharacter);
    return newCharacter;
  };

  const updateCharacter = (id: string, character: Omit<PlayerCharacter, 'id' | 'createdAt' | 'updatedAt'>) => {
    const index = characters.value.findIndex(c => c.id === id);
    if (index !== -1) {
      characters.value[index] = {
        ...character,
        id,
        createdAt: characters.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };

  const removeCharacter = (id: string) => {
    characters.value = characters.value.filter(c => c.id !== id);
    base.items.value = base.items.value.map(party => ({
      ...party,
      characters: party.characters.filter(charId => charId !== id)
    }));
  };

  const getCharacterById = (id: string) => characters.value.find(c => c.id === id) || null;

  const getPartyCharacters = (partyId: string) => {
    const party = base.items.value.find(p => p.id === partyId);
    if (!party) return [];
    return party.characters
      .map(id => characters.value.find(c => c.id === id))
      .filter((c): c is PlayerCharacter => c !== undefined);
  };

  const addCharacterToParty = (partyId: string, characterId: string) => {
    const party = base.items.value.find(p => p.id === partyId);
    if (party && !party.characters.includes(characterId)) {
      party.characters = [...party.characters, characterId];
      party.updatedAt = Date.now();
    }
  };

  const removeCharacterFromParty = (partyId: string, characterId: string) => {
    const party = base.items.value.find(p => p.id === partyId);
    if (party) {
      party.characters = party.characters.filter(id => id !== characterId);
      party.updatedAt = Date.now();
    }
  };

  const loadCharacters = async () => characters.value;

  return {
    // State
    items: base.items,
    filtered,
    sortedItems: base.sortedItems,
    currentId,
    current,
    isLoading: base.isLoading,
    error: base.error,
    isLoaded: base.isLoaded,

    // Actions
    load,
    create,
    update,
    remove,
    getById: base.getById,
    setCurrentId: (id: string | null) => { currentId.value = id; },
    clearCurrent: () => { currentId.value = null; },
    setFilter: (query: string) => { searchQuery.value = query; },
    clearFilter: () => { searchQuery.value = ''; },

    // Additional computed properties
    searchQuery,
    getCharacterById,
    addCharacter,
    removeCharacter,
    loadCharacters,
  };
}); 
