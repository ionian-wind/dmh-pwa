import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { Party, PlayerCharacter } from '@/types';
import { generateId, useStorage } from '@/utils/storage';
import partySchema from "@/schemas/party.schema.json";
import {registerValidationSchema} from "@/utils/schemaValidator";
import { useModuleStore } from '@/stores/modules';

registerValidationSchema('party', partySchema);

export const usePartyStore = defineStore('parties', () => {
  // State
  const items = useStorage<Party[]>({
    key: 'dnd-parties',
    defaultValue: [],
    schema: 'party'
  });
  const currentPartyId = ref<string | null>(null);
  const characters = useStorage<PlayerCharacter[]>({
    key: 'dnd-characters',
    defaultValue: [],
    schema: 'character'
  });

  // Computed
  const currentParty = computed(() => {
    if (!currentPartyId.value) return null;
    return items.value.find(p => p.id === currentPartyId.value) || null;
  });
  const filteredParties = computed(() => {
    const moduleStore = useModuleStore();
    return items.value.filter(party => moduleStore.matchesModuleFilterMultiple(party.moduleIds));
  });

  // CRUD
  const createParty = (party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newParty: Party = {
      ...party,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    items.value.push(newParty);
    return newParty;
  };
  const updateParty = (id: string, party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
    const index = items.value.findIndex(p => p.id === id);
    if (index !== -1) {
      items.value[index] = {
        ...party,
        id,
        createdAt: items.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };
  const deleteParty = (id: string) => {
    items.value = items.value.filter(p => p.id !== id);
    if (currentPartyId.value === id) currentPartyId.value = null;
  };
  const getPartyById = (id: string) => items.value.find(p => p.id === id) || null;
  const loadParties = async () => items.value;

  // Character helpers (legacy)
  const addCharacter = (character: Omit<PlayerCharacter, 'id'>) => {
    const newCharacter: PlayerCharacter = {
      ...character,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    characters.value.push(newCharacter);
    return newCharacter;
  };
  const updateCharacter = (id: string, character: Omit<PlayerCharacter, 'id'>) => {
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
  const deleteCharacter = (id: string) => {
    characters.value = characters.value.filter(c => c.id !== id);
    items.value = items.value.map(party => ({
      ...party,
      characters: party.characters.filter(charId => charId !== id)
    }));
  };
  const getCharacterById = (id: string) => characters.value.find(c => c.id === id) || null;
  const getPartyCharacters = (partyId: string) => {
    const party = items.value.find(p => p.id === partyId);
    if (!party) return [];
    return party.characters
      .map(id => characters.value.find(c => c.id === id))
      .filter((c): c is PlayerCharacter => c !== undefined);
  };
  const addCharacterToParty = (partyId: string, characterId: string) => {
    const party = items.value.find(p => p.id === partyId);
    if (party && !party.characters.includes(characterId)) {
      party.characters.push(characterId);
      party.updatedAt = Date.now();
    }
  };
  const removeCharacterFromParty = (partyId: string, characterId: string) => {
    const party = items.value.find(p => p.id === partyId);
    if (party) {
      party.characters = party.characters.filter(id => id !== characterId);
      party.updatedAt = Date.now();
    }
  };
  const loadCharacters = async () => characters.value;

  // Legacy aliases
  const parties = items;

  return {
    items,
    currentPartyId,
    currentParty,
    filteredParties,
    createParty,
    updateParty,
    deleteParty,
    getPartyById,
    loadParties,
    // Character helpers
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacterById,
    getPartyCharacters,
    addCharacterToParty,
    removeCharacterFromParty,
    loadCharacters,
    // Legacy aliases
    parties,
  };
}); 
