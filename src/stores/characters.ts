import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { PlayerCharacter, UUID } from '@/types';
import characterSchema from '@/schemas/character.schema.json';
import { registerValidationSchema } from '@/utils/schemaValidator';
import { extractMentionedEntities } from '@/utils/markdownParser';
import { createBaseStore, type StandardizedStore } from './createBaseStore';
import { migrateStorageData, migrateCharacterData } from '@/utils/storage';

registerValidationSchema('character', characterSchema);

const baseStore = createBaseStore<PlayerCharacter>({
  storageKey: 'dnd-characters',
  schema: 'character'
});

export const useCharacterStore = defineStore('characters', (): StandardizedStore<PlayerCharacter> => {
  const base = baseStore();
  const currentId = ref<UUID | null>(null);

  // Computed
  const current = computed(() => {
    if (!currentId.value) return null;
    return base.getById(currentId.value) || null;
  });

  const filteredCharacters = (partyId: UUID) => computed(() => 
    base.items.value.filter(c => c.partyId === partyId)
  );

  const filtered = computed(() => base.items.value);

  // Extended CRUD operations with standardized names
  const create = async (character: Omit<PlayerCharacter, 'id' | 'createdAt' | 'updatedAt'> & { partyId?: UUID | null }) => {
    const newChar = await base.create({
      ...character,
      partyId: character.partyId ?? null,
    });
    return newChar;
  };

  const update = async (id: UUID, character: Partial<PlayerCharacter>) => {
    const updatedChar = await base.update(id, character);
    return updatedChar;
  };

  const remove = async (id: UUID) => {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
  };

  const load = async () => {
    // Run migration first if data exists but validation fails
    try {
      const migratedData = await migrateStorageData('dnd-characters', migrateCharacterData, []);
      if (migratedData.length > 0 && base.items.value.length === 0) {
        // Only update if we have migrated data and no current data
        base.items.value = migratedData;
        console.log(`[Characters] Migrated ${migratedData.length} characters`);
      }
    } catch (e) {
      console.warn('[Characters] Migration failed:', e);
    }
    
    // Then load normally
    return base.load();
  };

  // Helpers
  const setParty = async (id: UUID, partyId: UUID | null) => {
    await update(id, { partyId });
  };

  const getByParty = (partyId: UUID) => base.items.value.filter(c => c.partyId === partyId);

  return {
    // State
    items: base.items,
    filtered,
    sortedItems: base.sortedItems,
    currentId,
    current,
    isLoading: base.isLoading,
    isLoaded: base.isLoaded,
    error: base.error,

    // Actions
    create,
    update,
    remove,
    getById: base.getById,
    load,

    // Additional helpers
    filteredCharacters,
    setParty,
    getByParty,
  };
});
