import type { Component } from 'vue';
import {
  IconBook,
  IconGhost3,
  IconMap,
  IconNote,
  IconSwords,
  IconUser,
  IconUsers,
} from '@tabler/icons-vue';
import type { MapEntityKind } from '@/maps/types';

export type EntityLinkKind =
  | 'note'
  | 'module'
  | 'party'
  | 'monster'
  | 'encounter'
  | 'character'
  | 'location';

export interface EntityDragData {
  kind: EntityLinkKind;
  id: string;
  title: string;
}

export const ENTITY_LINK_KINDS: EntityLinkKind[] = [
  'note',
  'module',
  'party',
  'monster',
  'encounter',
  'character',
  'location',
];

export const ENTITY_LINK_ICONS: Record<EntityLinkKind, Component> = {
  note: IconNote,
  module: IconBook,
  party: IconUsers,
  monster: IconGhost3,
  encounter: IconSwords,
  character: IconUser,
  location: IconMap,
};

/** Target kinds each entity model can represent a link to. */
export const ENTITY_LINK_TARGETS: Record<EntityLinkKind, EntityLinkKind[]> = {
  note: ['module', 'location'],
  module: ['note', 'party', 'monster', 'encounter', 'character', 'location'],
  party: ['module', 'character', 'location'],
  character: ['module', 'party', 'location'],
  monster: ['module', 'encounter', 'location'],
  encounter: ['module', 'monster', 'location'],
  location: [
    'note',
    'module',
    'party',
    'monster',
    'encounter',
    'character',
    'location',
  ],
};

export function toMapEntityKind(kind: EntityLinkKind): MapEntityKind {
  return kind;
}
