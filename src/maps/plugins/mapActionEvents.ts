import type Map from 'ol/Map';
import BaseEvent from 'ol/events/Event';
import type { MapAreaShape } from '../types';

export const MAP_ACTION_EVENT = 'map-action';

export type MapAction = 'add-marker' | 'draw-area' | 'cancel-drawing';

export interface MapActionDetail {
  action: MapAction;
  coordinate?: [number, number];
  shape?: MapAreaShape;
}

export class MapActionEvent extends BaseEvent {
  readonly action: MapAction;
  readonly coordinate?: [number, number];
  readonly shape?: MapAreaShape;

  constructor(detail: MapActionDetail) {
    super(MAP_ACTION_EVENT);
    this.action = detail.action;
    this.coordinate = detail.coordinate;
    this.shape = detail.shape;
  }
}

export function dispatchMapAction(map: Map, detail: MapActionDetail): void {
  map.dispatchEvent(new MapActionEvent(detail));
}

export function onMapAction(
  map: Map,
  handler: (event: MapActionEvent) => void,
): () => void {
  map.on(MAP_ACTION_EVENT as never, handler as never);
  return () => {
    map.un(MAP_ACTION_EVENT as never, handler as never);
  };
}
