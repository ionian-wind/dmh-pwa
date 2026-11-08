import { featureDragKinds, featureLinkIcons } from 'virtual:feature-links';
import type { Component } from 'vue';
import type { MapEntityKind } from '@/maps/types';

export type EntityLinkKind =
  'note' | 'party' | 'pawn' | 'encounter' | 'character' | 'location';

export interface EntityDragData {
  kind: EntityLinkKind;
  id: string;
  title: string;
}

export const ENTITY_LINK_KINDS = featureDragKinds as EntityLinkKind[];

export const ENTITY_LINK_ICONS = featureLinkIcons as Record<
  EntityLinkKind,
  Component
>;

/** Target kinds each entity model can represent a link to. */
export const ENTITY_LINK_TARGETS: Record<EntityLinkKind, EntityLinkKind[]> = {
  note: ['party', 'pawn', 'encounter', 'character', 'location'],
  party: ['note', 'character', 'location'],
  character: ['note', 'party', 'location'],
  pawn: ['note', 'encounter', 'location'],
  encounter: ['note', 'pawn', 'location'],
  location: ['note', 'party', 'pawn', 'encounter', 'character', 'location'],
};

export function toMapEntityKind(kind: EntityLinkKind): MapEntityKind {
  return kind;
}
