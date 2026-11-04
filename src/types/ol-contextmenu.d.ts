declare module 'ol-contextmenu' {
  import type OlMap from 'ol/Map';
  import type { Coordinate } from 'ol/coordinate';

  export interface CallbackObject {
    coordinate: Coordinate;
    data: unknown;
  }

  export type ItemSeparator = '-';

  export interface SingleItem {
    callback: (object: CallbackObject, map: OlMap) => void;
    classname?: string;
    data?: unknown;
    icon?: string;
    text: string;
  }

  export interface ItemWithNested {
    classname?: string;
    icon?: string;
    items: Item[];
    text: string;
  }

  export type Item = SingleItem | ItemSeparator | ItemWithNested;
}
