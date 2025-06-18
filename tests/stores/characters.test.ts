import { setActivePinia, createPinia } from 'pinia';
import { useCharacterStore } from '@/stores/characters';
import type { PlayerCharacter } from '@/types';

// Mock the storage utility
jest.mock('@/utils/storage', () => ({
  useStorage: jest.fn(() => ({
    value: []
  })),
  generateId: jest.fn(() => 'test-uuid-789')
}));

// Mock the schema validator
jest.mock('@/utils/schemaValidator', () => ({
  registerValidationSchema: jest.fn()
}));

describe('Character Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('adds a character', () => {
    const store = useCharacterStore();
    const character = {
      name: 'Alice',
      level: 2,
      class: 'Rogue',
      race: 'Halfling',
      playerName: 'A',
      stats: { strength: 10, dexterity: 16, constitution: 12, intelligence: 14, wisdom: 10, charisma: 12 },
      hitPoints: { maximum: 18, current: 18 },
      armorClass: 14,
      initiative: 3,
      speed: 25,
      proficiencies: [],
      equipment: []
    };
    const result = store.add(character);
    expect(result.id).toBe('test-uuid-789');
    expect(store.characters.value).toContainEqual(result);
  });

  it('updates a character', () => {
    const store = useCharacterStore();
    const char = store.add({
      name: 'Bob',
      level: 1,
      class: 'Fighter',
      race: 'Human',
      playerName: 'B',
      stats: { strength: 16, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 8 },
      hitPoints: { maximum: 20, current: 20 },
      armorClass: 16,
      initiative: 1,
      speed: 30,
      proficiencies: [],
      equipment: []
    });
    store.update(char.id, { name: 'Bob the Brave', level: 2 });
    expect(store.characters.value[0].name).toBe('Bob the Brave');
    expect(store.characters.value[0].level).toBe(2);
  });

  it('removes a character', () => {
    const store = useCharacterStore();
    const char = store.add({
      name: 'Charlie',
      level: 1,
      class: 'Cleric',
      race: 'Dwarf',
      playerName: 'C',
      stats: { strength: 14, dexterity: 10, constitution: 16, intelligence: 12, wisdom: 16, charisma: 8 },
      hitPoints: { maximum: 22, current: 22 },
      armorClass: 15,
      initiative: 0,
      speed: 25,
      proficiencies: [],
      equipment: []
    });
    store.remove(char.id);
    expect(store.characters.value).not.toContainEqual(char);
  });

  it('gets a character by id', () => {
    const store = useCharacterStore();
    const char = store.add({
      name: 'Dana',
      level: 3,
      class: 'Wizard',
      race: 'Elf',
      playerName: 'D',
      stats: { strength: 8, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 10, charisma: 13 },
      hitPoints: { maximum: 20, current: 15 },
      armorClass: 12,
      initiative: 2,
      speed: 30,
      proficiencies: [],
      equipment: []
    });
    const found = store.getById(char.id);
    expect(found).toEqual(char);
  });

  it('returns null for non-existent character', () => {
    const store = useCharacterStore();
    expect(store.getById('non-existent')).toBeNull();
  });

  it('gets characters by party', () => {
    const store = useCharacterStore();
    const char1 = store.add({
      name: 'Eve',
      level: 1,
      class: 'Bard',
      race: 'Human',
      playerName: 'E',
      partyId: 'party-1',
      stats: { strength: 10, dexterity: 14, constitution: 12, intelligence: 12, wisdom: 10, charisma: 16 },
      hitPoints: { maximum: 16, current: 16 },
      armorClass: 13,
      initiative: 2,
      speed: 30,
      proficiencies: [],
      equipment: []
    });
    const char2 = store.add({
      name: 'Frank',
      level: 1,
      class: 'Paladin',
      race: 'Human',
      playerName: 'F',
      partyId: 'party-1',
      stats: { strength: 16, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 12, charisma: 14 },
      hitPoints: { maximum: 18, current: 18 },
      armorClass: 17,
      initiative: 0,
      speed: 30,
      proficiencies: [],
      equipment: []
    });
    const result = store.getByParty('party-1');
    expect(result).toContainEqual(char1);
    expect(result).toContainEqual(char2);
  });

  it('setParty updates partyId', () => {
    const store = useCharacterStore();
    const char = store.add({
      name: 'Gina',
      level: 1,
      class: 'Druid',
      race: 'Elf',
      playerName: 'G',
      stats: { strength: 8, dexterity: 12, constitution: 14, intelligence: 14, wisdom: 16, charisma: 10 },
      hitPoints: { maximum: 14, current: 14 },
      armorClass: 13,
      initiative: 1,
      speed: 25,
      proficiencies: [],
      equipment: []
    });
    store.setParty(char.id, 'party-2');
    expect(store.getById(char.id)?.partyId).toBe('party-2');
  });
}); 