import { defineStore } from 'pinia';
import { computed } from 'vue';
import { PlayerCharacter, UUID } from '@/types';
import { generateId, useStorage } from '@/utils/storage';
import characterSchema from '@/schemas/character.schema.json';
import { registerValidationSchema } from '@/utils/schemaValidator';

registerValidationSchema('character', characterSchema);

export const useCharacterStore = defineStore('characters', () => {
  const characters = useStorage<PlayerCharacter[]>({
    key: 'dnd-characters',
    defaultValue: [],
    schema: 'character',
  });

  // List all characters
  const all = computed(() => characters.value);

  // Get character by id
  const getById = (id: UUID) => characters.value.find(c => c.id === id) || null;

  // Get characters by party
  const getByParty = (partyId: UUID) => characters.value.filter(c => c.partyId === partyId);

  // Get characters by module
  const getByModule = (moduleId: UUID) => characters.value.filter(c => c.moduleId === moduleId);

  // Add character
  const add = (character: Omit<PlayerCharacter, 'id' | 'createdAt' | 'updatedAt'> & { partyId?: UUID | null; moduleId?: UUID | null }) => {
    const newChar: PlayerCharacter = {
      ...character,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      partyId: character.partyId ?? null,
      moduleId: character.moduleId ?? null,
    };
    characters.value.push(newChar);
    return newChar;
  };

  // Update character
  const update = (id: UUID, character: Partial<PlayerCharacter>) => {
    const idx = characters.value.findIndex(c => c.id === id);
    if (idx !== -1) {
      characters.value[idx] = {
        ...characters.value[idx],
        ...character,
        updatedAt: Date.now(),
      };
    }
  };

  // Delete character
  const remove = (id: UUID) => {
    characters.value = characters.value.filter(c => c.id !== id);
  };

  // Link character to party
  const setParty = (id: UUID, partyId: UUID | null) => {
    update(id, { partyId });
  };

  return {
    characters,
    all,
    getById,
    getByParty,
    getByModule,
    add,
    update,
    remove,
    setParty,
  };
});
