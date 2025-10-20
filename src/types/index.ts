// Base types
export type UUID = string;
export type Timestamp = number;

export type ComponentInjection = {
  component: any;
  props?: Record<string, any>;
} | null;

// Utility types
export type WithId = { id: UUID };
export type WithTimestamps = {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
export type WithMetadata = WithId & WithTimestamps;

// Enums
export enum Section {
  TIMERS = 'timers',
  NOTES = 'notes',
  PARTIES = 'parties',
  MONSTERS = 'monsters',
  CHARACTERS = 'characters',
  ENCOUNTERS = 'encounters',
  MODULES = 'modules',
  SHEETS = 'sheets',
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
  hidden: boolean; // If true, note is hidden from general listing (e.g. document tree notes)
}

export interface ModuleTreeNode {
  noteId: UUID;
  children?: ModuleTreeNode[];
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
  notes?: string;
}

export interface PlayerCharacter extends Character {}

export interface Monster extends Character {
  moduleIds?: UUID[];
}

export interface Combatant extends WithMetadata {
  type: 'player' | 'monster';
  referenceId?: UUID;
  notes?: string;
  initiative: number;
  hasActed: boolean;
  isPostponed: boolean;
}

export interface Encounter extends WithMetadata {
  name: string;
  description?: string;
  monsters: Record<UUID, number>;
  moduleId: UUID;
  notes?: string;
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

export interface Bookmark extends WithMetadata {
  moduleId: UUID;
  noteId: string;
  title: string;
}

export interface Timer extends WithMetadata {
  title?: string;
  description?: string;
  duration: number; // milliseconds
  startedAt: number | null;
  status: 'inactive' | 'running' | 'finished';
}

// Sheet types
export interface SheetDefinition extends WithMetadata {
  name: string;
  description?: string;
  system?: string; // TTRPG system (optional)
  layout: SheetRow[]; // Grid layout
  metadata?: Record<string, unknown>; // Additional metadata
}

export interface SheetRow {
  id: string;
  columns: number; // Total columns in row (max 12)
  cells: SheetCell[];
}

export interface SheetCell {
  id: string;
  span: number; // Number of grid columns this cell spans (1-12)
  component?: SheetComponent;
}

export interface SheetComponent {
  id: string;
  type: string; // 'text', 'input', 'number', 'select', etc.
  props: Record<string, unknown>; // Component-specific properties
  label?: string;
  value?: any;
}

export * from './forms/form-input';
export * from './forms/form-filed';
