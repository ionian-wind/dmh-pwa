// Base types
export type UUID = string;
export type Timestamp = number;

// Utility types
export type WithId = { id: UUID };
export type WithTimestamps = {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
export type WithMetadata = WithId & WithTimestamps;

// Enums
export enum Section {
  NOTES = 'notes',
  PARTIES = 'parties',
  MONSTERS = 'monsters',
  CHARACTERS = 'characters',
  ENCOUNTERS = 'encounters',
  MODULES = 'modules'
}

// Core types
export interface Note extends WithMetadata {
  title: string;
  content: string;
  typeId: UUID | null;
  tags: string[];
  moduleId: UUID | null;
  parentId?: UUID;
  metadata?: Record<string, unknown>;
}

export interface Module extends WithMetadata {
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface NoteType extends WithMetadata {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  fields?: NoteTypeField[];
}

export interface NoteTypeField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  required?: boolean;
  options?: string[];
  defaultValue?: unknown;
}

export interface PlayerCharacter extends WithMetadata {
  name: string;
  level: number;
  class: string;
  race: string;
  playerName: string;
  alignment?: string;
  background?: string;
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  hitPoints: {
    maximum: number;
    current: number;
    temporary?: number;
  };
  armorClass: number;
  initiative: number;
  speed: number;
  proficiencies: string[];
  equipment: string[];
  spells?: string[];
  features?: string[];
  notes?: string;
  moduleId?: UUID | null;
  partyId?: UUID | null;
}

export interface Party extends WithMetadata {
  name: string;
  description?: string;
  characters: UUID[];
  notes?: string;
  moduleIds: UUID[];
}

export interface Monster extends WithMetadata {
  name: string;
  type: string;
  description: string;
  size: string;
  alignment: string;
  armorClass: number;
  hitPoints: number;
  speed: {
    walk?: number;
    fly?: number;
    swim?: number;
    burrow?: number;
    climb?: number;
  };
  savingThrows?: {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  skills?: Record<string, number>;
  damageVulnerabilities?: string[];
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  senses: string[];
  languages: string[];
  specialAbilities: string[];
  challengeRating: string;
  xp: number;
  traits?: string[];
  actions: string[];
  legendaryActions?: string[];
  notes?: string;
  moduleId: UUID;

  abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;  
    },
}

export interface Combatant extends WithMetadata {
  name: string;
  type: 'player' | 'monster';
  initiative: number;
  armorClass: number;
  hitPoints: {
    maximum: number;
    current: number;
    temporary?: number;
  };
  conditions: string[];
  referenceId?: UUID;
  notes?: string;
}

export interface Encounter extends WithMetadata {
  name: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  level: number;
  combatants: Combatant[];
  status: 'preparing' | 'active' | 'completed';
  currentRound: number;
  currentTurn: number;
  moduleId: UUID;
  partyId: UUID;
  notes?: string;
  xp: number;
  monsters?: [];
}
