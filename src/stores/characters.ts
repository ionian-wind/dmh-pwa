import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { PlayerCharacter, UUID } from '@/types';
import { generateId, useStorage } from '@/utils/storage';
import characterSchema from '@/schemas/character.schema.json';
import { registerValidationSchema } from '@/utils/schemaValidator';
import { extractMentionedEntities } from '@/utils/markdownParser';

registerValidationSchema('character', characterSchema);

export const useCharacterStore = defineStore('characters', () => {
  // State
  const [items, loaded] = useStorage<PlayerCharacter[]>({
    key: 'dnd-characters',
    defaultValue: [],
    schema: 'character',
  });
  const currentCharacterId = ref<UUID | null>(null);
  const isLoaded = loaded;

  // Computed
  const currentCharacter = computed(() => {
    if (!currentCharacterId.value) return null;
    return items.value.find(c => c.id === currentCharacterId.value) || null;
  });
  const filteredCharacters = (partyId: UUID) => computed(() => items.value.filter(c => c.partyId === partyId));

  // CRUD
  const createCharacter = (character: Omit<PlayerCharacter, 'id' | 'createdAt' | 'updatedAt'> & { partyId?: UUID | null }) => {
    const newChar: PlayerCharacter = {
      ...character,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      partyId: character.partyId ?? null,
    };
    items.value.push(newChar);
    return newChar;
  };
  const updateCharacter = (id: UUID, character: Partial<PlayerCharacter>) => {
    const idx = items.value.findIndex(c => c.id === id);
    if (idx !== -1) {
      items.value[idx] = {
        ...items.value[idx],
        ...character,
        updatedAt: Date.now(),
      };
    }
  };
  const deleteCharacter = (id: UUID) => {
    items.value = items.value.filter(c => c.id !== id);
    if (currentCharacterId.value === id) currentCharacterId.value = null;
  };
  const getCharacterById = (id: UUID) => items.value.find(c => c.id === id) || null;
  const loadCharacters = async () => {
    // (simulate async load, but use items.value for now)
    return items.value;
  };

  // Helpers
  const setParty = (id: UUID, partyId: UUID | null) => {
    updateCharacter(id, { partyId });
  };

  // Legacy aliases
  const all = computed(() => items.value);
  const getById = getCharacterById;
  const getByParty = (partyId: UUID) => items.value.filter(c => c.partyId === partyId);
  const add = createCharacter;
  const update = updateCharacter;
  const remove = deleteCharacter;

  return {
    items,
    currentCharacterId,
    currentCharacter,
    filteredCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacterById,
    loadCharacters,
    setParty,
    // Legacy aliases
    all,
    getById,
    getByParty,
    add,
    update,
    remove,
    isLoaded,
  };
});
