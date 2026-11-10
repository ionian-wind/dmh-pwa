import { describe, expect, it } from 'vitest';
import {
  createDoorObject,
  createStairsObject,
  createTextObject,
  hitTestObject,
  moveObject,
  objectBounds,
  unionBounds,
} from '@/map-studio/domain/objects';

describe('map studio objects', () => {
  it('creates and bounds text, doors and stairs', () => {
    const text = createTextObject('Hall', [1, 2], 1);
    expect(objectBounds(text)).toMatchObject({ x: 1, y: 2 });
    const door = createDoorObject([0, 0], [1, 0], 2);
    expect(objectBounds(door)).toMatchObject({ x: 0, y: 0, width: 1 });
    const stairs = createStairsObject(
      [
        [0, 0],
        [2, 0],
        [2, 3],
      ],
      3,
    );
    expect(objectBounds(stairs)).toMatchObject({
      x: 0,
      y: 0,
      width: 2,
      height: 3,
    });
  });

  it('hit-tests topmost objects and moves them', () => {
    const text = createTextObject('Hall', [1, 2], 1);
    const door = createDoorObject([0, 0], [2, 0], 2);
    expect(hitTestObject([text, door], [1, 0.1])?.id).toBe(door.id);
    expect(hitTestObject([text], [20, 20])).toBeNull();
    const moved = moveObject(text, 1, 1);
    expect(moved.type === 'text' && moved.transform.x).toBe(2);
    const movedDoor = moveObject(door, 1, 1);
    expect(movedDoor.type === 'door' && movedDoor.a).toEqual([1, 1]);
    const movedStairs = moveObject(
      createStairsObject(
        [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
        1,
      ),
      1,
      1,
    );
    expect(movedStairs.type === 'stairs' && movedStairs.points[0]).toEqual([
      1, 1,
    ]);
  });
});

describe('map studio selection bounds', () => {
  it('unions the bounds of several objects', () => {
    const a = createTextObject('A', [1, 1], 0);
    const b = createTextObject('B', [5, 4], 1);
    expect(unionBounds([])).toBeNull();
    expect(unionBounds([a])).toMatchObject(objectBounds(a));
    const bounds = unionBounds([a, b])!;
    expect(bounds.x).toBe(1);
    expect(bounds.y).toBe(1);
    expect(bounds.x + bounds.width).toBeGreaterThanOrEqual(8);
    expect(bounds.y + bounds.height).toBeGreaterThan(4);
  });
});
