import { generateId } from '@/utils/storage';
import type {
  DoorObject,
  Point,
  StairsObject,
  StudioObject,
  TextObject,
  Transform,
} from '@/map-studio/domain/document/types';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function base(order: number) {
  return {
    id: generateId(),
    parentId: null,
    order,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal' as const,
  };
}

export function createTransform(
  x: number,
  y: number,
  width: number,
  height: number,
): Transform {
  return {
    x,
    y,
    width: Math.max(0.1, width),
    height: Math.max(0.1, height),
    rotation: 0,
    flipX: false,
    flipY: false,
  };
}

export function createTextObject(
  text: string,
  point: Point,
  order: number,
): TextObject {
  const fontSize = 0.32;
  return {
    ...base(order),
    type: 'text',
    text,
    fontFamily: 'Georgia, serif',
    fontSize,
    color: '#1f2933',
    align: 'left',
    transform: createTransform(point[0], point[1], 3, fontSize * 1.4),
  };
}

export function createDoorObject(
  a: Point,
  b: Point,
  order: number,
): DoorObject {
  const width = Math.max(0.2, Math.hypot(b[0] - a[0], b[1] - a[1]));
  return {
    ...base(order),
    type: 'door',
    a,
    b,
    variant: 0,
    fill: '#f4efe4',
    stroke: '#1f2933',
    transform: createTransform(a[0], a[1], width, 0.18),
  };
}

export function createStairsObject(
  points: Point[],
  order: number,
): StairsObject {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    ...base(order),
    type: 'stairs',
    points,
    stepsPerCell: 3,
    stroke: '#1f2933',
    transform: createTransform(
      minX,
      minY,
      Math.max(0.2, Math.max(...xs) - minX),
      Math.max(0.2, Math.max(...ys) - minY),
    ),
  };
}

export function objectBounds(object: StudioObject): Bounds {
  if (object.type === 'text') {
    const width =
      object.transform.width ||
      Math.max(0.5, object.text.length * object.fontSize * 0.6);
    return {
      x: object.transform.x,
      y: object.transform.y,
      width,
      height: Math.max(object.fontSize * 1.4, object.transform.height),
    };
  }
  if (object.type === 'door') {
    const minX = Math.min(object.a[0], object.b[0]);
    const minY = Math.min(object.a[1], object.b[1]);
    const maxX = Math.max(object.a[0], object.b[0]);
    const maxY = Math.max(object.a[1], object.b[1]);
    return {
      x: minX,
      y: minY,
      width: Math.max(0.2, maxX - minX),
      height: Math.max(0.2, maxY - minY),
    };
  }
  const xs = object.points.map((point) => point[0]);
  const ys = object.points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(0.2, Math.max(...xs) - minX),
    height: Math.max(0.2, Math.max(...ys) - minY),
  };
}

export function pointInBounds(
  point: Point,
  bounds: Bounds,
  margin = 0,
): boolean {
  return (
    point[0] >= bounds.x - margin &&
    point[0] <= bounds.x + bounds.width + margin &&
    point[1] >= bounds.y - margin &&
    point[1] <= bounds.y + bounds.height + margin
  );
}

export function hitTestObject(
  objects: StudioObject[],
  point: Point,
): StudioObject | null {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const object = objects[index];
    if (object.visible === false) continue;
    if (pointInBounds(point, objectBounds(object), 0.15)) return object;
  }
  return null;
}

export function moveObject(
  object: StudioObject,
  dx: number,
  dy: number,
): StudioObject {
  if (object.type === 'text') {
    return {
      ...object,
      transform: {
        ...object.transform,
        x: object.transform.x + dx,
        y: object.transform.y + dy,
      },
    };
  }
  if (object.type === 'door') {
    return {
      ...object,
      a: [object.a[0] + dx, object.a[1] + dy],
      b: [object.b[0] + dx, object.b[1] + dy],
      transform: {
        ...object.transform,
        x: object.transform.x + dx,
        y: object.transform.y + dy,
      },
    };
  }
  return {
    ...object,
    points: object.points.map(([x, y]) => [x + dx, y + dy] as Point),
    transform: {
      ...object.transform,
      x: object.transform.x + dx,
      y: object.transform.y + dy,
    },
  };
}
