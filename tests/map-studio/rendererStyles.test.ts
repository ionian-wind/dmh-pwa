import { describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => {
  class FakeContainer {
    children: FakeContainer[] = [];
    alpha = 1;
    blendMode = 'normal';
    visible = true;
    width = 0;
    height = 0;
    destroyed = false;
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    addChild<T extends FakeContainer>(child: T): T {
      this.children.push(child);
      return child;
    }
    removeChildren(): FakeContainer[] {
      const children = [...this.children];
      this.children = [];
      return children;
    }
    destroy(): void {
      this.destroyed = true;
    }
  }
  class FakeGraphics extends FakeContainer {
    moves: number[] = [];
    circles = 0;
    clear(): this {
      return this;
    }
    rect(): this {
      return this;
    }
    roundRect(): this {
      return this;
    }
    poly(): this {
      return this;
    }
    circle(): this {
      this.circles += 1;
      return this;
    }
    moveTo(x: number): this {
      this.moves.push(x);
      return this;
    }
    lineTo(): this {
      return this;
    }
    fill(): this {
      return this;
    }
    stroke(): this {
      return this;
    }
  }
  class FakeSprite extends FakeGraphics {}
  return { FakeContainer, FakeGraphics, FakeSprite };
});

vi.mock('pixi.js', () => ({
  Application: class {
    stage = new fake.FakeContainer();
    canvas = document.createElement('canvas');
    ticker = { stop: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
    renderer = {
      resize: vi.fn(),
      render: vi.fn(),
      extract: { canvas: vi.fn() },
    };
    destroy = vi.fn();
  },
  Container: fake.FakeContainer,
  Graphics: fake.FakeGraphics,
  Sprite: fake.FakeSprite,
  Rectangle: class {},
  Texture: { WHITE: {}, from: vi.fn(() => ({})) },
}));

import { PixiStudioRenderer } from '@/map-studio/renderer/PixiStudioRenderer';
import {
  createDungeonLayer,
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';
import {
  createImageObject,
  createTextObject,
} from '@/map-studio/domain/objects';
import type {
  DungeonLayer,
  DungeonLayerStyle,
  ImagesLayer,
} from '@/map-studio/domain/document/types';

function styledLayer(overrides: Partial<DungeonLayerStyle> = {}): DungeonLayer {
  return createDungeonLayer({
    opacity: 0.8,
    blendMode: 'multiply',
    shapes: [
      {
        id: 'room',
        operation: 'add',
        shape: {
          kind: 'rectangle',
          x: 0,
          y: 0,
          width: 4,
          height: 4,
          cornerRadius: 0,
          rough: 0,
          smooth: false,
        },
      },
    ],
    style: {
      floor: { visible: true, color: '#ffffff' },
      walls: {
        visible: true,
        color: '#111111',
        width: 0.1,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: true, color: '#222222', width: 1 },
      shadow: {
        visible: true,
        opacity: 0.4,
        offsetX: 0.1,
        offsetY: 0.2,
        color: '#000000',
        blendMode: 'screen',
      },
      hatching: {
        visible: true,
        variant: 'diagonal',
        size: 0.5,
        color: '#333333',
        width: 0.01,
      },
      shading: {
        visible: true,
        size: 0.2,
        roughness: 1,
        color: '#444444',
        opacity: 0.5,
      },
      ...overrides,
    },
  });
}

function drawLayer(layer: DungeonLayer) {
  const renderer = new PixiStudioRenderer();
  (renderer as any).drawDungeonLayer(layer);
  const container = (renderer as any).dungeonContainer.children[0] as any;
  return { renderer, container };
}

describe('Pixi dungeon style passes', () => {
  it('renders shadow, floor, shading, hatching and walls with blend modes', () => {
    const layer = styledLayer();
    const { container } = drawLayer(layer);
    expect(container.alpha).toBe(0.8);
    expect(container.children).toHaveLength(6);
    expect(container.children[0].blendMode).toBe('screen');
    expect(container.children[1].blendMode).toBe('multiply');
    expect(container.children[2].blendMode).toBe('multiply');
    expect(container.children[3].blendMode).toBe('multiply');
    expect(container.children[4].blendMode).toBe('multiply');
    expect(container.children[5].blendMode).toBe('multiply');
    expect(container.children[0].moves.length).toBeGreaterThan(0);
    expect(container.children[3].moves.length).toBeGreaterThan(0);
    expect(container.children[4].moves.length).toBeGreaterThan(0);
  });

  it('skips disabled style passes', () => {
    const layer = styledLayer();
    layer.style.shadow.visible = false;
    layer.style.shading.visible = false;
    layer.style.hatching.visible = false;
    const { container } = drawLayer(layer);
    expect(container.children).toHaveLength(3);
    expect(container.children[0].blendMode).toBe('multiply');
    expect(container.children[1].blendMode).toBe('multiply');
    expect(container.children[2].blendMode).toBe('multiply');
  });

  it('renders no dungeon container content for an empty layer', () => {
    const layer = createDungeonLayer({
      style: {
        ...createDungeonLayer().style,
        shadow: { ...createDungeonLayer().style.shadow, visible: false },
      },
    });
    const { container } = drawLayer(layer);
    expect(container.children).toHaveLength(2);
    expect(container.children[0].children).toHaveLength(0);
    expect(container.children[1].children).toHaveLength(0);
  });
});

describe('Pixi object blend modes', () => {
  it('applies layer and object blend modes to image layers', () => {
    const map = createMap(createProject().id);
    const images = map.layers.find(
      (layer) => layer.type === 'images',
    ) as ImagesLayer;
    images.opacity = 0.75;
    images.blendMode = 'screen';
    const object = createImageObject(
      'data:image/png;base64,AA==',
      [1, 1],
      2,
      2,
      0,
    );
    object.blendMode = 'add';
    images.objects.push(object);
    const renderer = new PixiStudioRenderer();
    (renderer as any).app = { renderer: { render: vi.fn() } };
    (renderer as any).map = map;
    (renderer as any).imageTextures.set(object.src, {});
    (renderer as any).draw();
    const layerContainer = (renderer as any).objectsContainer.children[0];
    expect(layerContainer.alpha).toBe(0.75);
    expect(layerContainer.blendMode).toBe('screen');
    expect(layerContainer.children[0].blendMode).toBe('add');
  });

  it('falls back to the layer blend mode for normal objects', () => {
    const map = createMap(createProject().id);
    const images = map.layers.find(
      (layer) => layer.type === 'images',
    ) as ImagesLayer;
    images.blendMode = 'multiply';
    const object = createImageObject(
      'data:image/png;base64,AA==',
      [1, 1],
      2,
      2,
      0,
    );
    images.objects.push(object);
    const renderer = new PixiStudioRenderer();
    (renderer as any).app = { renderer: { render: vi.fn() } };
    (renderer as any).map = map;
    (renderer as any).imageTextures.set(object.src, {});
    (renderer as any).draw();
    const layerContainer = (renderer as any).objectsContainer.children[0];
    expect(layerContainer.children[0].blendMode).toBe('multiply');
  });
});

describe('Pixi renderer public operations', () => {
  function appFake() {
    const render = vi.fn();
    const resize = vi.fn();
    const extractCanvas = vi.fn();
    return {
      app: {
        stage: new fake.FakeContainer(),
        canvas: document.createElement('canvas'),
        ticker: { stop: vi.fn() },
        init: vi.fn().mockResolvedValue(undefined),
        renderer: { render, resize, extract: { canvas: extractCanvas } },
        destroy: vi.fn(),
      },
      render,
      resize,
      extractCanvas,
    };
  }

  it('initializes and destroys the application', async () => {
    const renderer = new PixiStudioRenderer();
    await renderer.init(document.createElement('div'));
    expect(renderer.ready).toBe(true);
    const texture = { destroy: vi.fn() };
    (renderer as any).imageTextures.set('a', texture);
    renderer.destroy();
    expect(texture.destroy).toHaveBeenCalledWith(true);
    expect(renderer.ready).toBe(false);
    renderer.destroy();
  });

  it('handles viewport, resize, fit and coordinate conversion', () => {
    const renderer = new PixiStudioRenderer();
    const { app, resize } = appFake();
    (renderer as any).app = app;
    renderer.setViewport({ x: 10, y: 20, zoom: 2 });
    expect(renderer.getViewport()).toEqual({ x: 10, y: 20, zoom: 2 });
    expect(renderer.screenToWorld(14, 24)).toEqual([2 / 70, 2 / 70]);
    renderer.resize(0, 0);
    expect(resize).toHaveBeenCalledWith(1, 1);
    const map = createMap(createProject().id);
    renderer.setMap(map);
    renderer.fit();
    expect(renderer.getViewport().zoom).toBeGreaterThan(0);
    renderer.setMap(null as any);
    renderer.fit();
  });

  it('draws background and grid variants', () => {
    const renderer = new PixiStudioRenderer();
    const { app } = appFake();
    (renderer as any).app = app;
    (renderer as any).drawBackgroundAndGrid();
    const map = createMap(createProject().id);
    map.grid.type = 'none';
    renderer.setMap(map);
    map.grid.type = 'square';
    map.settings.showGrid = false;
    renderer.setViewport({ x: 0, y: 0, zoom: 1 });
    map.settings.showGrid = true;
    map.grid.width = 2;
    renderer.setViewport({ x: 0, y: 0, zoom: 0.01 });
    renderer.setViewport({ x: 0, y: 0, zoom: 1 });
    map.grid.type = 'dot';
    renderer.setViewport({ x: 0, y: 0, zoom: 1 });
    expect((renderer as any).gridLayer.circles).toBeGreaterThan(0);
    map.grid.type = 'none';
    (renderer as any).gridLayer.circles = 0;
    renderer.setViewport({ x: 0, y: 0, zoom: 1 });
    expect((renderer as any).gridLayer.circles).toBe(0);
  });

  it('renders shape, layer and geometry selections', () => {
    const renderer = new PixiStudioRenderer();
    const { app } = appFake();
    (renderer as any).app = app;
    const layer = styledLayer();
    const wall = layer.shapes[0];
    renderer.setShapeSelection(null);
    renderer.setShapeSelection({
      ...wall,
      shape: {
        kind: 'wall',
        points: [
          [0, 0],
          [1, 1],
        ],
        width: 0.1,
        dash: false,
        dashSize: 0.4,
        rough: 0,
        smooth: false,
      },
    });
    renderer.setShapeSelection({
      ...wall,
      shape: {
        kind: 'rectangle',
        x: 0,
        y: 0,
        width: 2,
        height: 2,
        cornerRadius: 0,
        rough: 0,
        smooth: false,
      },
    });
    renderer.setLayerHighlight(layer, [{ x: 0, y: 0, width: 1, height: 1 }]);
    renderer.setLayerHighlight(null, null);
    renderer.setGeometrySelection(null);
    renderer.setGeometrySelection([
      [0, 0],
      [1, 0],
    ]);
    renderer.setGeometrySelection([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
  });

  it('renders selection handles and door endpoints', () => {
    const renderer = new PixiStudioRenderer();
    const { app } = appFake();
    (renderer as any).app = app;
    renderer.setSelection(null);
    renderer.setSelection({ x: 0, y: 0, width: 2, height: 2 }, [
      [0, 0],
      [1, 1],
    ]);
  });

  it('renders all preview variants', () => {
    const renderer = new PixiStudioRenderer();
    const { app } = appFake();
    (renderer as any).app = app;
    renderer.setPreview(null);
    renderer.setPreview({
      kind: 'rectangle',
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      cornerRadius: 0.2,
    });
    renderer.setPreview({
      kind: 'rectangle',
      x: 0,
      y: 0,
      width: 2,
      height: 2,
    });
    renderer.setPreview({ kind: 'circle', cx: 1, cy: 1, radius: 1 });
    renderer.setPreview({ kind: 'line', points: [[0, 0]] });
    renderer.setPreview({
      kind: 'line',
      points: [
        [0, 0],
        [1, 1],
      ],
    });
    renderer.setPreview({
      kind: 'polygons',
      polygons: [
        [
          [0, 0],
          [1, 1],
        ],
        [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      ],
    });
    renderer.setPreview({
      kind: 'polygon',
      points: [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
    });
    renderer.setPreview({ kind: 'polygon', points: [] });
  });

  it('exports an image and rejects when the canvas cannot encode', async () => {
    const renderer = new PixiStudioRenderer();
    await expect(renderer.exportImage(70)).rejects.toThrow(
      'Renderer is not ready',
    );
    const { app, extractCanvas } = appFake();
    const canvas = {
      toBlob: (callback: (blob: Blob | null) => void) =>
        callback(new Blob(['ok'], { type: 'image/png' })),
    };
    extractCanvas.mockReturnValue(canvas);
    (renderer as any).app = app;
    (renderer as any).map = createMap(createProject().id);
    const blob = await renderer.exportImage(140, 'image/jpeg');
    expect(blob.size).toBeGreaterThan(0);
    extractCanvas.mockReturnValue({
      toBlob: (callback: (blob: Blob | null) => void) => callback(null),
    });
    await expect(renderer.exportImage(70)).rejects.toThrow(
      'Could not encode the map image',
    );
  });

  it('renders text, image, door and stairs objects', () => {
    const map = createMap(createProject().id);
    const images = map.layers.find(
      (layer) => layer.type === 'images',
    ) as ImagesLayer;
    images.blendMode = 'screen';
    const image = createImageObject(
      'data:image/png;base64,AA==',
      [1, 1],
      2,
      2,
      0,
    );
    const missing = createImageObject('missing.png', [2, 2], 1, 1, 1);
    const doorA = {
      id: 'door-a',
      type: 'door' as const,
      parentId: null,
      order: 2,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal' as const,
      a: [0, 0] as [number, number],
      b: [1, 0] as [number, number],
      variant: 0 as const,
      fill: '#000000',
      stroke: '#ffffff',
      rough: 0 as const,
      transform: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        rotation: 0,
        flipX: false,
        flipY: false,
      },
    };
    const doorB = {
      ...doorA,
      id: 'door-b',
      order: 3,
      variant: 1 as const,
      rough: 4 as any,
    };
    const stairs = {
      id: 'stairs',
      type: 'stairs' as const,
      parentId: null,
      order: 4,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal' as const,
      points: [
        [0, 0],
        [2, 0],
        [2, 2],
      ] as [number, number][],
      stepsPerCell: 4,
      stroke: '#ffffff',
      rough: 1 as const,
      transform: {
        x: 0,
        y: 0,
        width: 2,
        height: 2,
        rotation: 0,
        flipX: false,
        flipY: false,
      },
    };
    images.objects.push(image, missing, doorA, doorB, stairs as any);
    const renderer = new PixiStudioRenderer();
    const { app } = appFake();
    (renderer as any).app = app;
    (renderer as any).map = map;
    (renderer as any).imageTextures.set(image.src, {});
    (renderer as any).draw();
    expect((renderer as any).loadingImages.has('missing.png')).toBe(true);
    (renderer as any).draw();
    expect(
      (renderer as any).objectsContainer.children[0].children,
    ).toHaveLength(4);
    (renderer as any).map = null;
    (renderer as any).draw();
  });
});

describe('Pixi renderer style edge cases', () => {
  function appFake() {
    return {
      stage: new fake.FakeContainer(),
      renderer: { render: vi.fn(), resize: vi.fn() },
      ticker: { stop: vi.fn() },
      destroy: vi.fn(),
    };
  }

  it('renders text with flips, alignment and shadows', () => {
    const context = {
      font: '',
      textBaseline: '',
      globalAlpha: 1,
      fillStyle: '',
      measureText: vi.fn(() => ({ width: 48 })),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
    };
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as any);
    const map = createMap(createProject().id);
    const images = map.layers.find(
      (layer) => layer.type === 'images',
    ) as ImagesLayer;
    const centered = createTextObject('Centered', [1, 1], 0);
    centered.align = 'center';
    centered.transform.flipX = true;
    centered.transform.flipY = true;
    centered.transform.width = 0.1;
    centered.shadow.enabled = true;
    const right = createTextObject('Right', [2, 2], 1);
    right.align = 'right';
    right.transform.width = 4;
    const hidden = createImageObject('hidden.png', [3, 3], 1, 1, 2);
    hidden.visible = false;
    images.objects.push(centered, right, hidden);
    const renderer = new PixiStudioRenderer();
    (renderer as any).app = appFake();
    (renderer as any).map = map;
    (renderer as any).draw();
    expect(context.fillText).toHaveBeenCalled();
    const children = (renderer as any).objectsContainer.children[0].children;
    expect(children).toHaveLength(2);
    spy.mockRestore();
  });

  it('skips hidden floor/walls and empty hatching', () => {
    const layer = styledLayer();
    layer.style.floor.visible = false;
    layer.style.walls.visible = false;
    layer.style.shadow.visible = false;
    layer.style.shading.visible = false;
    const { container } = drawLayer(layer);
    expect(container.children).toHaveLength(2);
    expect(container.children[0].moves.length).toBeGreaterThan(0);
    expect(container.children[1].moves.length).toBeGreaterThan(0);

    const emptyHatch = styledLayer({
      floor: { visible: false, color: '#ffffff' },
      walls: {
        visible: false,
        color: '#111111',
        width: 0.1,
        blocksLight: true,
        dash: false,
      },
      shadow: {
        visible: false,
        opacity: 0,
        offsetX: 0,
        offsetY: 0,
        color: '#000000',
        blendMode: 'normal',
      },
      hatching: {
        visible: true,
        variant: 'dots',
        size: 0.5,
        color: '#333333',
        width: 0.01,
      },
      shading: {
        visible: false,
        size: 0.2,
        roughness: 0,
        color: '#444444',
        opacity: 0.5,
      },
    });
    emptyHatch.shapes = [];
    const { container: empty } = drawLayer(emptyHatch);
    expect(empty.children).toHaveLength(0);
  });

  it('renders dashed wall shapes and coincident door endpoints', () => {
    const layer = styledLayer({
      floor: { visible: false, color: '#ffffff' },
      hatching: {
        visible: false,
        variant: 'diagonal',
        size: 0.5,
        color: '#333333',
        width: 0.01,
      },
      shading: {
        visible: false,
        size: 0.2,
        roughness: 0,
        color: '#444444',
        opacity: 0.5,
      },
      shadow: {
        visible: false,
        opacity: 0,
        offsetX: 0,
        offsetY: 0,
        color: '#000000',
        blendMode: 'normal',
      },
    });
    layer.shapes.push({
      id: 'dashed',
      operation: 'add',
      shape: {
        kind: 'wall',
        points: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        width: 0.1,
        dash: true,
        dashSize: 0.2,
        rough: 1,
        smooth: false,
      },
    });
    const { container } = drawLayer(layer);
    expect(container.children).toHaveLength(2);
    expect(container.children[0].moves.length).toBeGreaterThan(0);
    expect(container.children[1].moves.length).toBeGreaterThan(0);

    const map = createMap(createProject().id);
    const images = map.layers.find(
      (layer) => layer.type === 'images',
    ) as ImagesLayer;
    images.objects.push({
      id: 'door',
      type: 'door',
      parentId: null,
      order: 0,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      a: [1, 1],
      b: [1, 1],
      variant: 1,
      fill: '#000000',
      stroke: '#ffffff',
      rough: 4 as any,
      transform: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        rotation: 0,
        flipX: false,
        flipY: false,
      },
    });
    const renderer = new PixiStudioRenderer();
    (renderer as any).app = appFake();
    (renderer as any).map = map;
    (renderer as any).draw();
    expect(
      (renderer as any).objectsContainer.children[0].children,
    ).toHaveLength(1);
  });
});
