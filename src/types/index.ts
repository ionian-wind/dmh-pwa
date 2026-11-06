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
  AMBIENT_SOUND = 'ambient-sound',
  MAPS = 'maps',
}

// Core types
export type NoteContentType = 'text' | 'draw';

export interface Note extends WithMetadata {
  title: string;
  content: string;
  contentType: NoteContentType;
  /** Small PNG data URL preview for drawing notes. */
  preview?: string;
  /** Optional CSS background colour for the note surface. */
  backgroundColor?: string;
  typeId: UUID | null;
  tags: string[];
  moduleIds: UUID[];
  parentId?: UUID;
  metadata?: Record<string, unknown>;
  hidden: boolean; // If true, note is hidden from general listing (e.g. document tree notes)
}

/**
 * Shared state for the note detail page's inline view/edit mode. The note view
 * owns the state; the right sidebar receives the same reactive object so its
 * mode switch, visual-editor toggle and options panel stay in sync.
 */
export interface NoteEditState {
  isEditMode: boolean;
  isVisualMode: boolean;
  draft: Note | null;
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
  moduleIds: UUID[];
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

export * from './forms/form-input';
export * from './forms/form-filed';
