import * as THREE from 'three';
import type {
  DiceRenderer,
  DiceRendererOptions,
  DiceResult,
  DiceVisual,
} from './DiceRenderer';
import {
  loadDiceAssets,
  type DiceAsset,
  type DiceAssetSet,
} from './assetLoader';
import {
  composeD100,
  randomValueFor,
  splitD100,
  visualDiceForSides,
  type VisualDiePart,
} from './diceValues';
import { cosmeticSpin, targetQuaternion } from './faceOrientation';
import { RapierDiceWorld } from './RapierDiceWorld';
import { loadDiceMaterials, type DiceMaterialSet } from './themeLoader';
import { hasSimulationTimedOut } from './timing';

const DICE_SCALE = 1.7;

interface RenderedDie {
  id: string;
  visualId: string;
  mesh: THREE.Mesh;
  asset: DiceAsset;
  sides: number;
  part: VisualDiePart['part'];
  kind: VisualDiePart['kind'];
  state: 'physics' | 'done';
  result?: number;
}

function scaledPoints(points: Float32Array, scale: number): Float32Array {
  const result = new Float32Array(points.length);
  for (let index = 0; index < points.length; index += 1) {
    result[index] = points[index] * scale;
  }
  return result;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface SpawnPlan {
  x: number;
  z: number;
  y: number;
  throwAngle: number;
  speed: number;
}

export class ThreeDiceRenderer implements DiceRenderer {
  readonly kind = 'three' as const;

  private container: HTMLElement | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private renderer: THREE.WebGLRenderer | null = null;
  private assets: DiceAssetSet | null = null;
  private materials: DiceMaterialSet | null = null;
  private physics = new RapierDiceWorld();
  private dice = new Map<string, RenderedDie>();
  private options: DiceRendererOptions | null = null;
  private frame: number | null = null;
  private lastFrame = 0;
  private animationStarted = 0;
  private disposed = false;

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
  };

  async init(
    container: HTMLElement,
    options: DiceRendererOptions,
  ): Promise<void> {
    this.container = container;
    this.options = options;
    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, options.maxPixelRatio ?? 2),
    );
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(renderer.domElement);
    renderer.domElement.addEventListener(
      'webglcontextlost',
      this.onContextLost,
    );
    this.renderer = renderer;

    // Zenith view. `up` must point along -Z when looking straight down,
    // otherwise `lookAt` has no stable roll reference.
    this.camera.up.set(0, 0, -1);
    this.camera.position.set(0, 8.5, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const ambient = new THREE.HemisphereLight(0xffffff, 0x777777, 1.6);
    this.scene.add(ambient);
    // Key light enters from the scene's left-top corner (world -X/-Z under the
    // zenith camera) and points at the centre of the floor.
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-2.8, 14, -2.8);
    key.target.position.set(0, 0, 0);
    this.scene.add(key.target);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(5, 4, 4);
    this.scene.add(fill);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0;
    shadow.receiveShadow = true;
    this.scene.add(shadow);

    const [assets, materials] = await Promise.all([
      loadDiceAssets({
        assetPath: options.assetPath,
        theme: options.theme,
      }),
      loadDiceMaterials(options.assetPath, options.theme),
    ]);
    this.assets = assets;
    this.materials = materials;
    await this.physics.init();
    this.renderFrame();
  }

  add(dice: readonly DiceVisual[]): void {
    if (!this.assets || !this.materials || !this.renderer) return;
    const max = this.options?.maxDice ?? 40;
    for (const visual of dice) {
      const parts = visualDiceForSides(visual.sides);
      const base = this.spawnPlan();
      for (let index = 0; index < parts.length; index += 1) {
        if (this.dice.size >= max) return;
        this.addDie(
          visual,
          parts[index],
          this.offsetSpawn(base, parts.length, index),
        );
      }
    }
    this.startAnimation();
  }

  replace(dice: readonly DiceVisual[]): void {
    this.clear();
    this.add(dice);
  }

  clear(): void {
    if (this.frame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.frame);
    }
    this.frame = null;
    for (const die of this.dice.values()) {
      this.scene.remove(die.mesh);
    }
    this.dice.clear();
    this.physics.clear();
    this.renderFrame();
  }

  getResults(): DiceResult[] {
    const groups = new Map<
      string,
      { sides: number; parts: Map<VisualDiePart['part'], number> }
    >();
    for (const die of this.dice.values()) {
      if (die.result === undefined) continue;
      let group = groups.get(die.visualId);
      if (!group) {
        group = { sides: die.sides, parts: new Map() };
        groups.set(die.visualId, group);
      }
      group.parts.set(die.part, die.result);
    }

    return [...groups.entries()].map(([id, group]) => ({
      id,
      sides: group.sides,
      value:
        group.sides === 100
          ? composeD100(
              group.parts.get('tens') ?? 0,
              group.parts.get('units') ?? 10,
            )
          : (group.parts.get('whole') ?? 1),
    }));
  }

  pick(clientX: number, clientY: number): DiceResult | null {
    if (!this.renderer) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const meshes = [...this.dice.values()]
      .filter((die) => die.result !== undefined)
      .map((die) => die.mesh);
    const hit = raycaster.intersectObjects(meshes, false)[0]?.object;
    if (!hit) return null;
    const die = [...this.dice.values()].find((entry) => entry.mesh === hit);
    if (!die || die.result === undefined) return null;
    return (
      this.getResults().find((result) => result.id === die.visualId) ?? null
    );
  }

  resize(width: number, height: number): void {
    if (!this.renderer) return;
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.camera.aspect = Math.max(1, width) / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    // Resizing must redraw, never clear the scene.
    this.renderFrame();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.physics.dispose();
    this.materials?.dispose();
    this.materials = null;
    if (this.assets) {
      for (const asset of this.assets.assets.values()) {
        asset.geometry.dispose();
      }
      this.assets = null;
    }
    if (this.renderer) {
      this.renderer.domElement.removeEventListener(
        'webglcontextlost',
        this.onContextLost,
      );
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
    this.container = null;
  }

  private spawnPlan(): SpawnPlan {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(angle) * randomBetween(1.2, 3),
      z: Math.sin(angle) * randomBetween(0.9, 2.2),
      // Flatter, lower throw with a bit more force toward the tray centre.
      y: randomBetween(1, 2),
      throwAngle: angle + Math.PI + (Math.random() - 0.5) * (Math.PI / 3),
      speed: randomBetween(0.1, 0.2),
    };
  }

  /** Keep multi-part visuals (d100) dropping from essentially the same spot. */
  private offsetSpawn(
    base: SpawnPlan,
    count: number,
    index: number,
  ): SpawnPlan {
    if (count <= 1) return base;
    const offset = index === 0 ? -0.22 : 0.22;
    const perpendicular = base.throwAngle + Math.PI / 2;
    return {
      x: base.x + Math.cos(perpendicular) * offset,
      z: base.z + Math.sin(perpendicular) * offset,
      y: base.y + index * 0.12,
      throwAngle: base.throwAngle + (index - 0.5) * 0.15,
      speed: base.speed,
    };
  }

  private addDie(
    visual: DiceVisual,
    part: VisualDiePart,
    spawn: SpawnPlan,
  ): void {
    if (!this.assets || !this.materials) return;
    const asset = this.assets.assets.get(part.kind);
    if (!asset) return;
    const material =
      part.kind === 'd2' ? this.materials.extras : this.materials.standard;
    const mesh = new THREE.Mesh(asset.geometry, material);
    mesh.scale.setScalar(DICE_SCALE);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const id = `${visual.id}:${part.id}`;
    const x = spawn.x;
    const z = spawn.z;
    const spawnHeight = spawn.y;

    mesh.position.set(x, spawnHeight, z);
    this.scene.add(mesh);

    const rendered: RenderedDie = {
      id,
      visualId: visual.id,
      mesh,
      asset,
      sides: Math.round(visual.sides),
      part: part.part,
      kind: part.kind,
      state: 'physics',
    };

    if (this.options?.reducedMotion) {
      const value = randomValueFor(visual);
      const { tens, units } = splitD100(value);
      const faceValue =
        part.part === 'tens' ? tens : part.part === 'units' ? units : value;
      mesh.quaternion.copy(
        targetQuaternion(
          asset.faceNormals,
          faceValue,
          cosmeticSpin(`${id}:target`, faceValue),
          part.kind === 'd4',
        ),
      );
      this.restOnFloor(mesh);
      rendered.state = 'done';
      rendered.result = faceValue;
      this.dice.set(id, rendered);
      return;
    }

    mesh.quaternion.setFromEuler(
      new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      ),
    );
    const throwAngle = spawn.throwAngle;
    const throwSpeed = spawn.speed;
    const body = this.physics.add(
      id,
      scaledPoints(asset.colliderPoints, DICE_SCALE),
      {
        x,
        y: spawnHeight,
        z,
        rotation: {
          x: mesh.quaternion.x,
          y: mesh.quaternion.y,
          z: mesh.quaternion.z,
          w: mesh.quaternion.w,
        },
        impulse: {
          x: Math.cos(throwAngle) * throwSpeed,
          y: randomBetween(-0.01, 0.015),
          z: Math.sin(throwAngle) * throwSpeed,
        },
        torque: {
          x: randomBetween(-0.035, 0.035),
          y: randomBetween(-0.035, 0.035),
          z: randomBetween(-0.035, 0.035),
        },
      },
      0.1,
    );

    if (!body) {
      this.restOnFloor(mesh);
      rendered.state = 'done';
      rendered.result = this.readFaceValue(rendered);
    }
    this.dice.set(id, rendered);
  }

  private startAnimation(): void {
    if (this.frame !== null) return;
    if (typeof requestAnimationFrame !== 'function') {
      for (const die of this.dice.values()) {
        if (die.state === 'physics') this.finishDie(die);
      }
      this.renderFrame();
      return;
    }
    this.animationStarted = performance.now();
    this.lastFrame = this.animationStarted;
    this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (time: number) => {
    this.frame = null;
    const delta = Math.min(Math.max((time - this.lastFrame) / 1000, 0), 0.1);
    this.lastFrame = time;

    let physicsActive = false;
    for (const die of this.dice.values()) {
      if (die.state === 'physics') {
        physicsActive = true;
        break;
      }
    }

    if (physicsActive) {
      this.physics.step(delta);
      for (const die of this.dice.values()) {
        if (die.state !== 'physics') continue;
        const transform = this.physics.transform(die.id);
        if (transform) {
          die.mesh.position.set(
            transform.position.x,
            transform.position.y,
            transform.position.z,
          );
          die.mesh.quaternion.set(
            transform.rotation.x,
            transform.rotation.y,
            transform.rotation.z,
            transform.rotation.w,
          );
        }
      }
      const timedOut = hasSimulationTimedOut(this.animationStarted, time);
      if (timedOut || this.physics.settleReady) {
        for (const die of this.dice.values()) {
          if (die.state === 'physics') this.finishDie(die);
        }
      }
    }

    this.renderFrame();
    if (physicsActive) {
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private finishDie(die: RenderedDie): void {
    die.state = 'done';
    this.restOnFloor(die.mesh);
    die.result = this.readFaceValue(die);
  }

  /** Read the upward face; d4 values live on the face touching the table. */
  private readFaceValue(die: RenderedDie): number {
    const faceDown = die.kind === 'd4';
    let bestValue = faceDown ? 0 : 0;
    let bestY = faceDown ? Infinity : -Infinity;
    for (const [value, normal] of die.asset.faceNormals) {
      const y = normal.clone().applyQuaternion(die.mesh.quaternion).y;
      if (faceDown ? y < bestY : y > bestY) {
        bestY = y;
        bestValue = value;
      }
    }
    return bestValue;
  }

  private restOnFloor(mesh: THREE.Mesh, lift = 0.001): void {
    mesh.position.y = 0;
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    mesh.position.y = -box.min.y + lift;
  }

  private renderFrame(): void {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }
}
