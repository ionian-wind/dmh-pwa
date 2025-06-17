import { defineStore } from 'pinia';
import { computed } from 'vue';
import { Party, PlayerCharacter } from '@/types';
import { generateId, useStorage } from '@/utils/storage';
import partySchema from "@/schemas/party.schema.json";
import {registerValidationSchema} from "@/utils/schemaValidator";
import { useModuleStore } from '@/stores/modules';

registerValidationSchema('party', partySchema);

export const usePartyStore = defineStore('parties', () => {
  const parties = useStorage<Party[]>({
    key: 'dnd-parties',
    defaultValue: [],
    schema: 'party'
  });

  const characters = useStorage<PlayerCharacter[]>({
    key: 'dnd-characters',
    defaultValue: [],
    schema: 'character'
  });

  const currentPartyId = useStorage<string | null>({
    key: 'dnd-current-party',
    defaultValue: null
  });

  const getPartyById = (id: string) => parties.value.find(p => p.id === id) || null;
  
  const currentParty = computed(() => {
    if (!currentPartyId.value) return null;
    return getPartyById(currentPartyId.value);
  });

  const filteredParties = computed(() => {
    const moduleStore = useModuleStore();
    if (!moduleStore.currentModuleId) return parties.value;
    return parties.value.filter(party => {
      const moduleIds = party.moduleIds || [];
      return moduleIds.includes(moduleStore.currentModuleId!);
    });
  });

  const loadParties = async () => {
    // Parties are automatically loaded by useStorage
    return parties.value;
  };

  const loadCharacters = async () => {
    // Characters are automatically loaded by useStorage
    return characters.value;
  };

  const addParty = (party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newParty: Party = {
      ...party,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    parties.value.push(newParty);
    return newParty;
  };

  // Alias for addParty to maintain compatibility
  const createParty = addParty;

  const updateParty = (id: string, party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
    const index = parties.value.findIndex(p => p.id === id);
    if (index !== -1) {
      parties.value[index] = {
        ...party,
        id,
        createdAt: parties.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };

  const deleteParty = (id: string) => {
    parties.value = parties.value.filter(p => p.id !== id);
    if (currentPartyId.value === id) {
      currentPartyId.value = null;
    }
  };

  const setCurrentParty = (id: string | null) => {
    currentPartyId.value = id;
  };

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

  // Alias for addCharacter to maintain compatibility
  const createCharacter = addCharacter;

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
    // Remove character from all parties
    parties.value = parties.value.map(party => ({
      ...party,
      characters: party.characters.filter(charId => charId !== id)
    }));
  };

  const getCharacter = (id: string) => {
    return characters.value.find(c => c.id === id) || null;
  };

  // Alias for getCharacter to maintain compatibility
  const getCharacterById = getCharacter;

  const getPartyCharacters = (partyId: string) => {
    const party = parties.value.find(p => p.id === partyId);
    if (!party) return [];
    return party.characters
      .map(id => characters.value.find(c => c.id === id))
      .filter((c): c is PlayerCharacter => c !== undefined);
  };

  const addCharacterToParty = (partyId: string, characterId: string) => {
    const party = parties.value.find(p => p.id === partyId);
    if (party && !party.characters.includes(characterId)) {
      party.characters.push(characterId);
      party.updatedAt = Date.now();
    }
  };

  const removeCharacterFromParty = (partyId: string, characterId: string) => {
    const party = parties.value.find(p => p.id === partyId);
    if (party) {
      party.characters = party.characters.filter(id => id !== characterId);
      party.updatedAt = Date.now();
    }
  };

  return {
    parties,
    characters,
    currentPartyId,
    currentParty,
    getPartyById,
    addParty,
    createParty,
    updateParty,
    deleteParty,
    setCurrentParty,
    addCharacter,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacter,
    getCharacterById,
    getPartyCharacters,
    loadParties,
    loadCharacters,
    addCharacterToParty,
    removeCharacterFromParty,
    filteredParties
  };
}); 
