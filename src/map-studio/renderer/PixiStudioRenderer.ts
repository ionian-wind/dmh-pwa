import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';
import { compileDungeonLayer } from '@/map-studio/domain/geometry/compile';
import type { Bounds } from '@/map-studio/domain/objects';
import type {
  DungeonLayer,
  Point,
  StudioMap,
  StudioObject,
} from '@/map-studio/domain/document/types';
import { BASE_PIXELS_PER_CELL } from '@/map-studio/domain/document/types';

export interface StudioViewport {
  x: number;
  y: number;
  zoom: number;
}

export type StudioPreview =
  | { kind: 'rectangle'; x: number; y: number; width: number; height: number }
  | { kind: 'circle'; cx: number; cy: number; radius: number }
  | { kind: 'polygon'; points: Point[] };

export class PixiStudioRenderer {
  private app: Application | null = null;
  private host: HTMLElement | null = null;
  private world = new Container();
  private content = new Container();
  private backgroundLayer = new Graphics();
  private gridLayer = new Graphics();
  private dungeonContainer = new Container();
  private objectsContainer = new Container();
  private selectionLayer = new Graphics();
  private previewLayer = new Graphics();
  private map: StudioMap | null = null;
  private imageTextures = new Map<string, Texture>();
  private loadingImages = new Set<string>();
  private width = 1;
  private height = 1;
  private viewport: StudioViewport = { x: 0, y: 0, zoom: 1 };

  async init(host: HTMLElement): Promise<void> {
    this.host = host;
    this.width = host.clientWidth || 1;
    this.height = host.clientHeight || 1;
    this.app = new Application();
    await this.app.init({
      width: this.width,
      height: this.height,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });
    this.app.canvas.style.position = 'absolute';
    this.app.canvas.style.inset = '0';
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    host.appendChild(this.app.canvas);
    this.world.addChild(
      this.backgroundLayer,
      this.gridLayer,
      this.dungeonContainer,
      this.objectsContainer,
      this.selectionLayer,
      this.previewLayer,
    );
    this.content.addChild(this.world);
    this.app.stage.addChild(this.content);
    this.app.ticker.stop();
  }

  get ready(): boolean {
    return this.app !== null;
  }

  setMap(map: StudioMap): void {
    this.map = map;
    this.draw();
  }

  setViewport(viewport: StudioViewport): void {
    this.viewport = viewport;
    this.world.position.set(viewport.x, viewport.y);
    this.world.scale.set(viewport.zoom);
    this.render();
  }

  getViewport(): StudioViewport {
    return { ...this.viewport };
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.app?.renderer.resize(this.width, this.height);
    this.render();
  }

  fit(): void {
    if (!this.map) return;
    const mapWidth = this.map.width * BASE_PIXELS_PER_CELL;
    const mapHeight = this.map.height * BASE_PIXELS_PER_CELL;
    const padding = 48;
    const zoom = Math.min(
      (this.width - padding * 2) / mapWidth,
      (this.height - padding * 2) / mapHeight,
    );
    this.setViewport({
      zoom: Math.max(0.05, zoom),
      x: (this.width - mapWidth * zoom) / 2,
      y: (this.height - mapHeight * zoom) / 2,
    });
  }

  screenToWorld(screenX: number, screenY: number): Point {
    return [
      (screenX - this.viewport.x) / this.viewport.zoom / BASE_PIXELS_PER_CELL,
      (screenY - this.viewport.y) / this.viewport.zoom / BASE_PIXELS_PER_CELL,
    ];
  }

  setSelection(bounds: Bounds | null): void {
    this.selectionLayer.clear();
    if (!bounds) {
      this.render();
      return;
    }
    const ppc = BASE_PIXELS_PER_CELL;
    const x = bounds.x * ppc;
    const y = bounds.y * ppc;
    const w = bounds.width * ppc;
    const h = bounds.height * ppc;
    this.selectionLayer
      .rect(x, y, w, h)
      .stroke({ color: '#2d6fb3', width: 2, alpha: 1 });
    const handle = Math.max(6, 8 / this.viewport.zoom);
    for (const [hx, hy] of [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ]) {
      this.selectionLayer
        .rect(hx - handle / 2, hy - handle / 2, handle, handle)
        .fill('#ffffff')
        .stroke({ color: '#2d6fb3', width: 2 });
    }
    this.selectionLayer
      .circle(x + w / 2, y - handle * 2, handle * 0.7)
      .fill('#ffffff')
      .stroke({ color: '#2d6fb3', width: 2 });
    this.render();
  }

  setPreview(preview: StudioPreview | null): void {
    this.previewLayer.clear();
    if (!preview) {
      this.render();
      return;
    }
    const ppc = BASE_PIXELS_PER_CELL;
    if (preview.kind === 'rectangle') {
      this.previewLayer
        .rect(
          preview.x * ppc,
          preview.y * ppc,
          preview.width * ppc,
          preview.height * ppc,
        )
        .fill({ color: '#4a90d9', alpha: 0.2 })
        .stroke({ color: '#2d6fb3', width: 2 });
    } else if (preview.kind === 'circle') {
      this.previewLayer
        .circle(preview.cx * ppc, preview.cy * ppc, preview.radius * ppc)
        .fill({ color: '#4a90d9', alpha: 0.2 })
        .stroke({ color: '#2d6fb3', width: 2 });
    } else if (preview.points.length > 0) {
      const points = preview.points.flatMap(([x, y]) => [x * ppc, y * ppc]);
      this.previewLayer
        .poly(points)
        .fill({ color: '#4a90d9', alpha: 0.2 })
        .stroke({ color: '#2d6fb3', width: 2 });
    }
    this.render();
  }

  async exportImage(
    pixelsPerCell: number,
    mimeType = 'image/png',
  ): Promise<Blob> {
    if (!this.app || !this.map) {
      throw new Error('Renderer is not ready');
    }
    const resolution = pixelsPerCell / BASE_PIXELS_PER_CELL;
    const frame = new Rectangle(
      0,
      0,
      this.map.width * BASE_PIXELS_PER_CELL,
      this.map.height * BASE_PIXELS_PER_CELL,
    );
    const canvas = this.app.renderer.extract.canvas({
      target: this.content,
      frame,
      resolution,
      antialias: true,
    });
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob?.((blob: Blob | null) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode the map image'));
      }, mimeType);
    });
  }

  render(): void {
    this.app?.renderer.render(this.app.stage);
  }

  destroy(): void {
    this.app?.ticker.stop();
    for (const texture of this.imageTextures.values()) texture.destroy(true);
    this.imageTextures.clear();
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.host = null;
    this.map = null;
  }

  private draw(): void {
    const map = this.map;
    if (!map) return;
    const ppc = BASE_PIXELS_PER_CELL;
    const mapWidth = map.width * ppc;
    const mapHeight = map.height * ppc;

    this.backgroundLayer.clear();
    this.backgroundLayer.rect(0, 0, mapWidth, mapHeight).fill({
      color: map.background.style.color,
      alpha: map.background.style.opacity,
    });

    this.gridLayer.clear();
    if (map.settings.showGrid && map.grid.type === 'square') {
      const step = Math.max(1, map.grid.cellDiameter) * ppc;
      const color = map.grid.color;
      for (let x = 0; x <= map.width; x += 1) {
        this.gridLayer
          .moveTo(x * ppc, 0)
          .lineTo(x * ppc, mapHeight)
          .stroke({ color, width: map.grid.width, alpha: 0.7 });
      }
      for (let y = 0; y <= map.height; y += 1) {
        this.gridLayer
          .moveTo(0, y * ppc)
          .lineTo(mapWidth, y * ppc)
          .stroke({ color, width: map.grid.width, alpha: 0.7 });
      }
      void step;
    }

    for (const child of this.dungeonContainer.removeChildren()) {
      child.destroy();
    }
    for (const layer of map.layers) {
      if (layer.type !== 'dungeon' || !layer.visible) continue;
      this.drawDungeonLayer(layer);
    }
    for (const child of this.objectsContainer.removeChildren()) {
      child.destroy({ children: true });
    }
    for (const layer of map.layers) {
      if (layer.type !== 'images' || !layer.visible) continue;
      for (const object of [...layer.objects].sort(
        (a, b) => a.order - b.order,
      )) {
        if (!object.visible) continue;
        if (object.type === 'text') {
          const sprite = this.createTextSprite(object, ppc);
          sprite.scale.set(
            (object.transform.flipX ? -1 : 1) / 2,
            (object.transform.flipY ? -1 : 1) / 2,
          );
          sprite.position.set(
            object.transform.x * ppc +
              (object.transform.flipX ? sprite.width : 0),
            object.transform.y * ppc +
              (object.transform.flipY ? sprite.height : 0),
          );
          sprite.alpha = object.opacity;
          this.objectsContainer.addChild(sprite);
        } else if (object.type === 'image') {
          const texture = this.imageTextures.get(object.src);
          if (texture) {
            const sprite = new Sprite(texture);
            sprite.width = object.transform.width * ppc;
            sprite.height = object.transform.height * ppc;
            sprite.position.set(
              object.transform.x * ppc,
              object.transform.y * ppc,
            );
            sprite.alpha = object.opacity;
            this.objectsContainer.addChild(sprite);
          } else if (!this.loadingImages.has(object.src)) {
            this.loadingImages.add(object.src);
            const image = new Image();
            image.onload = () => {
              this.imageTextures.set(object.src, Texture.from(image));
              this.loadingImages.delete(object.src);
              this.draw();
            };
            image.onerror = () => this.loadingImages.delete(object.src);
            image.src = object.src;
          }
        } else if (object.type === 'door') {
          const graphics = new Graphics();
          graphics
            .moveTo(object.a[0] * ppc, object.a[1] * ppc)
            .lineTo(object.b[0] * ppc, object.b[1] * ppc)
            .stroke({ color: object.stroke, width: 6 });
          this.objectsContainer.addChild(graphics);
        } else if (object.type === 'stairs') {
          const graphics = new Graphics();
          const [a, b, c] = object.points;
          const steps = Math.max(2, object.stepsPerCell);
          for (let index = 0; index <= steps; index += 1) {
            const t = index / steps;
            const x1 = a[0] + (b[0] - a[0]) * t;
            const y1 = a[1] + (b[1] - a[1]) * t;
            const x2 = x1 + (c[0] - b[0]) * t;
            const y2 = y1 + (c[1] - b[1]) * t;
            graphics
              .moveTo(x1 * ppc, y1 * ppc)
              .lineTo(x2 * ppc, y2 * ppc)
              .stroke({ color: object.stroke, width: 2 });
          }
          this.objectsContainer.addChild(graphics);
        }
      }
    }
    this.render();
  }

  private createTextSprite(
    object: Extract<StudioObject, { type: 'text' }>,
    ppc: number,
  ): Sprite {
    const fontSize = Math.max(8, object.fontSize * ppc);
    const resolution = 2;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return new Sprite(Texture.WHITE);
    context.font = `${fontSize * resolution}px ${object.fontFamily}`;
    const metrics = context.measureText(object.text);
    const width = Math.max(1, Math.ceil(metrics.width) + 4 * resolution);
    const height = Math.ceil(fontSize * 1.4 * resolution);
    canvas.width = width;
    canvas.height = height;
    context.scale(resolution, resolution);
    context.font = `${fontSize}px ${object.fontFamily}`;
    context.fillStyle = object.color;
    context.textBaseline = 'top';
    context.fillText(object.text, 0, 0);
    const sprite = new Sprite(Texture.from(canvas));
    sprite.scale.set(1 / resolution);
    return sprite;
  }

  private drawDungeonLayer(layer: DungeonLayer): void {
    const ppc = BASE_PIXELS_PER_CELL;
    const graphics = new Graphics();
    graphics.alpha = layer.opacity;
    const compiled = compileDungeonLayer(layer);

    if (layer.style.floor.visible) {
      for (const polygon of compiled.polygons) {
        const outer = polygon[0];
        if (!outer || outer.length < 3) continue;
        graphics.poly(outer.flat()).fill(layer.style.floor.color);
      }
    }

    if (layer.style.walls.visible) {
      for (const segment of compiled.wallSegments) {
        graphics
          .moveTo(segment.a[0] * ppc, segment.a[1] * ppc)
          .lineTo(segment.b[0] * ppc, segment.b[1] * ppc)
          .stroke({
            color: layer.style.walls.color,
            width: Math.max(1, layer.style.walls.width * ppc),
            alpha: 1,
          });
      }
    }
    this.dungeonContainer.addChild(graphics);
  }
}
