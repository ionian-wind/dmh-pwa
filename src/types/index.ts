// Base types
export type UUID = string;
export type Timestamp = number;

export type ComponentInjection = {
  component: any;
  props?: Record<string, any>;
  flushFooter?: boolean;
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
  PAWNS = 'pawns',
  CHARACTERS = 'characters',
  ENCOUNTERS = 'encounters',
  AMBIENT_SOUND = 'ambient-sound',
  MAPS = 'maps',
}

// Core types
export type NoteLinkKind = 'party' | 'pawn' | 'encounter' | 'character';

export interface NoteLink {
  kind: NoteLinkKind;
  id: UUID;
}

export interface Note extends WithMetadata {
  title: string;
  content: string;
  typeId: UUID | null;
  tags: string[];
  /** Cross-entity links stored on the note; location links live on the location. */
  links?: NoteLink[];
  parentId?: UUID;
  metadata?: Record<string, unknown>;
}

/**
 * Shared state for an entity detail page's inline view/edit mode. The view
 * owns the state; the right sidebar receives the same reactive object so its
 * mode switch, visual-editor toggle and optional options panel stay in sync.
 */
export interface InlineEditState<T> {
  isEditMode: boolean;
  isVisualMode: boolean;
  draft: T | null;
}

export type NoteEditState = InlineEditState<Note>;

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

export interface Drawing extends WithMetadata {
  id: UUID;
  /** Quickdraw JSON snapshot. */
  snapshot: string;
  /** PNG data URL used to render the drawing in documents. */
  preview: string;
}

export interface Party extends WithMetadata {
  name: string;
  description?: string;
  characters: UUID[];
}

// Common base for PlayerCharacter and Pawn
export interface Character extends WithMetadata {
  name: string;
  notes?: string;
}

export interface PlayerCharacter extends Character {}

export interface Pawn extends Character {}

export interface Combatant extends WithMetadata {
  type: 'player' | 'pawn';
  referenceId?: UUID;
  notes?: string;
  initiative: number;
  hasActed: boolean;
  isPostponed: boolean;
}

export interface Encounter extends WithMetadata {
  name: string;
  description?: string;
  pawns: Record<UUID, number>;
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

export type BookmarkOwnerKind = 'note';

export interface Bookmark extends WithMetadata {
  /** Legacy anchor mirror kept for older note bookmarks. */
  noteId: string;
  title: string;
  ownerKind?: BookmarkOwnerKind;
  ownerId?: UUID;
  anchorId?: string;
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
