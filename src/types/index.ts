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

export interface ModuleTreeNode {
  id: UUID;
  title?: string;
  notes: UUID[]; // ordered list of note IDs
  children?: ModuleTreeNode[];
  anchorId?: string; // for section anchor
  noteAnchors?: Record<UUID, string>; // noteId -> anchorId
}

export interface Module extends WithMetadata {
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
  noteTree?: ModuleTreeNode[];
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

export interface Party extends WithMetadata {
  name: string;
  description?: string;
  characters: UUID[];
  notes?: string;
  moduleIds: UUID[];
}

// Common base for PlayerCharacter and Monster
export interface Character extends WithMetadata {
  name: string;
  alignment?: string;
  armorClass: number;
  notes?: string;
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
}

export interface PlayerCharacter extends Character {
  level: number;
  class: string;
  race: string;
  playerName: string;
  background?: string;
  hitPoints: {
    maximum: number;
    current: number;
    temporary?: number;
  };
  initiative: number;
  speed: number;
  proficiencies: string[];
  equipment: string[];
  spells?: string[];
  features?: string[];
  partyId?: UUID | null;
}

export interface Monster extends Character {
  type: string;
  description: string;
  size: string;
  alignment: string;
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
  moduleIds?: UUID[];
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
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
  monsters: Record<UUID, number>;
  currentRound: number;
  currentTurn: number;
  moduleId: UUID;
  notes?: string;
  xp: number;
}

export interface Combat extends WithMetadata {
  encounterId: UUID;
  partyId: UUID;
  status: 'preparing' | 'active' | 'completed';
  currentRound: number;
  currentTurn: number;
  combatants: Combatant[];
  notes?: string;
}
