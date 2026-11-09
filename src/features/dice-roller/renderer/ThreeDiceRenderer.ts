import * as THREE from 'three';
import type {
  DiceRenderer,
  DiceRendererOptions,
  DiceResult,
  DiceSceneEntry,
  DiceVisual,
} from './DiceRenderer';
import { PLAY_BOUNDS } from './DiceRenderer';
import {
  loadDiceAssets,
  type DiceAsset,
  type DiceAssetSet,
} from './assetLoader';
import {
  composeD100,
  maxFaceFor,
  randomValueFor,
  splitD100,
  visualDiceForSides,
  type VisualDiePart,
} from './diceValues';
import { cosmeticSpin, targetQuaternion } from './faceOrientation';
import { RapierDiceWorld } from './RapierDiceWorld';
import { loadDiceMaterials, type DiceMaterialSet } from './themeLoader';
import { hasSimulationTimedOut } from './timing';
import { computeTossRelease, trimTossSamples, type TossSample } from './toss';

const DICE_SCALE = 1.7;
const MAX_EXPLOSIONS = 20;

interface RenderedDie {
  id: string;
  visualId: string;
  rootId: string;
  mesh: THREE.Mesh;
  asset: DiceAsset;
  sides: number;
  part: VisualDiePart['part'];
  kind: VisualDiePart['kind'];
  state: 'physics' | 'done' | 'dragging';
  result?: number;
  exploded?: boolean;
  pulse?: { start: number; duration: number };
  explode?: DiceVisual['explode'];
  isExtra?: boolean;
  penalty?: number;
  label?: string;
  notation?: string;
}

interface DragPart {
  die: RenderedDie;
  startX: number;
  startZ: number;
  lift: number;
}

interface DragState {
  start: THREE.Vector3;
  parts: DragPart[];
  samples: TossSample[];
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
  /** Horizontal throw direction in radians. */
  way: number;
  /** Horizontal impulse strength. */
  force: number;
  /** Optional explicit release velocity (explosions). */
  velocity?: { x: number; y: number; z: number };
  /** Optional explicit angular impulse magnitude (explosions). */
  angular?: number;
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
  private explosions = new Map<string, number>();
  private dragState: DragState | null = null;
  private options: DiceRendererOptions | null = null;
  private frame: number | null = null;
  private lastFrame = 0;
  private animationStarted = 0;
  private settledNotified = false;
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
    this.fitCamera(width, height);

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
    this.settledNotified = false;
    this.wakeSettledDice();
    // Existing pool dice may be knocked onto new faces, but only the new batch
    // (and its explosion extras) is allowed to explode.
    for (const die of this.dice.values()) die.exploded = true;
    const max = this.options?.maxDice ?? 80;
    for (const visual of dice) {
      const parts = visualDiceForSides(visual.sides, visual.kind);
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
    this.dragState = null;
    this.explosions.clear();
    this.settledNotified = false;
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

  debugScene(): DiceSceneEntry[] {
    return [...this.dice.values()].map((die, index) => ({
      order: index,
      sceneOrder: this.scene.children.indexOf(die.mesh),
      id: die.id,
      visualId: die.visualId,
      rootId: die.rootId,
      sides: die.sides,
      kind: die.kind,
      state: die.state,
      ...(die.result !== undefined ? { result: die.result } : {}),
      position: {
        x: die.mesh.position.x,
        y: die.mesh.position.y,
        z: die.mesh.position.z,
      },
      rotation: {
        x: die.mesh.quaternion.x,
        y: die.mesh.quaternion.y,
        z: die.mesh.quaternion.z,
        w: die.mesh.quaternion.w,
      },
      scale: die.mesh.scale.x,
    }));
  }

  getResults(): DiceResult[] {
    const groups = new Map<
      string,
      {
        sides: number;
        kind: VisualDiePart['kind'];
        parts: Map<VisualDiePart['part'], number>;
        sample: RenderedDie;
      }
    >();
    for (const die of this.dice.values()) {
      if (die.result === undefined) continue;
      let group = groups.get(die.visualId);
      if (!group) {
        group = {
          sides: die.sides,
          kind: die.kind,
          parts: new Map(),
          sample: die,
        };
        groups.set(die.visualId, group);
      }
      group.parts.set(die.part, die.result);
    }

    return [...groups.entries()].map(([id, group]) => {
      const penalty = group.sample.penalty ?? 0;
      const value =
        group.sides === 100
          ? composeD100(
              group.parts.get('tens') ?? 0,
              group.parts.get('units') ?? 10,
            )
          : (group.parts.get('whole') ?? 0);
      return {
        id,
        sides: group.sides,
        kind: group.kind,
        value: value - penalty,
        ...(group.sample.label ? { label: group.sample.label } : {}),
        ...(group.sample.notation ? { notation: group.sample.notation } : {}),
        ...(group.sample.explode ? { explode: group.sample.explode } : {}),
        ...(group.sample.isExtra ? { isExtra: true } : {}),
        ...(penalty !== 0 ? { penalty } : {}),
        rootId: group.sample.rootId,
      };
    });
  }

  pick(clientX: number, clientY: number): DiceResult | null {
    const die = this.pickDie(clientX, clientY);
    if (!die || die.result === undefined) return null;
    return (
      this.getResults().find((result) => result.id === die.visualId) ?? null
    );
  }

  beginDrag(clientX: number, clientY: number): boolean {
    if (this.dragState) return false;
    const primary = this.pickDie(clientX, clientY);
    if (!primary) return false;
    const start = this.pointerOnDragPlane(clientX, clientY);
    if (!start) return false;

    const parts: DragPart[] = [];
    for (const die of this.dice.values()) {
      // d100 parts share a visualId and move together; explosion extras have
      // their own visualId and are dragged individually.
      if (die.visualId !== primary.visualId) continue;
      this.physics.remove(die.id);
      die.state = 'dragging';
      die.result = undefined;
      parts.push({
        die,
        startX: die.mesh.position.x,
        startZ: die.mesh.position.z,
        lift: parts.length * 0.14,
      });
    }
    this.dragState = {
      start,
      parts,
      samples: [{ point: { x: start.x, z: start.z }, time: performance.now() }],
    };
    this.dragTo(clientX, clientY);
    return parts.length > 0;
  }

  dragTo(clientX: number, clientY: number): void {
    if (!this.dragState) return;
    const point = this.pointerOnDragPlane(clientX, clientY);
    if (!point) return;
    const now = performance.now();
    this.dragState.samples.push({
      point: { x: point.x, z: point.z },
      time: now,
    });
    trimTossSamples(this.dragState.samples, now);
    const dx = point.x - this.dragState.start.x;
    const dz = point.z - this.dragState.start.z;
    for (const part of this.dragState.parts) {
      part.die.mesh.position.set(
        Math.min(Math.max(part.startX + dx, -3.2), 3.2),
        0.9 + part.lift,
        Math.min(Math.max(part.startZ + dz, -2.3), 2.3),
      );
    }
    this.renderFrame();
  }

  endDrag(): void {
    if (!this.dragState) return;
    this.wakeSettledDice();
    for (const die of this.dice.values()) die.exploded = true;
    const parts = this.dragState.parts;
    const release = computeTossRelease(
      this.dragState.samples,
      performance.now(),
    );
    this.dragState = null;
    for (const part of parts) {
      const die = part.die;
      const body = this.physics.add(
        die.id,
        scaledPoints(die.asset.colliderPoints, DICE_SCALE),
        {
          x: die.mesh.position.x,
          y: die.mesh.position.y,
          z: die.mesh.position.z,
          rotation: {
            x: die.mesh.quaternion.x,
            y: die.mesh.quaternion.y,
            z: die.mesh.quaternion.z,
            w: die.mesh.quaternion.w,
          },
          // Release velocity comes from the cursor; zero velocity is a drop.
          ...(release.speed > 0
            ? {
                linearVelocity: {
                  x: release.vx,
                  y: 0,
                  z: release.vz,
                },
                torque: {
                  x: randomBetween(-release.spin, release.spin),
                  y: randomBetween(-release.spin, release.spin),
                  z: randomBetween(-release.spin, release.spin),
                },
              }
            : {}),
        },
        0.1,
      );
      die.state = body ? 'physics' : 'done';
      // The dragged die is a fresh throw and may explode again.
      die.exploded = false;
      if (!body) {
        this.restOnFloor(die.mesh);
        die.result = this.readFaceValue(die);
      }
    }
    // A drop is a new simulation; do not inherit an old timeout.
    this.animationStarted = performance.now();
    this.settledNotified = false;
    this.startAnimation();
  }

  resize(width: number, height: number): void {
    if (!this.renderer) return;
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    this.renderer.setSize(safeWidth, safeHeight, false);
    this.fitCamera(safeWidth, safeHeight);
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
      way: angle + Math.PI + (Math.random() - 0.5) * (Math.PI / 3),
      force: randomBetween(0.1, 0.2),
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
    const perpendicular = base.way + Math.PI / 2;
    return {
      x: base.x + Math.cos(perpendicular) * offset,
      z: base.z + Math.sin(perpendicular) * offset,
      y: base.y + index * 0.12,
      way: base.way + (index - 0.5) * 0.15,
      force: base.force,
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
      part.kind === 'd2' || part.kind === 'fate'
        ? this.materials.extras
        : this.materials.standard;
    const mesh = new THREE.Mesh(asset.geometry, material);
    mesh.scale.setScalar(DICE_SCALE);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const id = `${visual.id}:${part.id}`;
    const rootId = visual.rootId ?? visual.id;
    mesh.position.set(spawn.x, spawn.y, spawn.z);
    this.scene.add(mesh);

    const rendered: RenderedDie = {
      id,
      visualId: visual.id,
      rootId,
      mesh,
      asset,
      sides: Math.round(visual.sides),
      part: part.part,
      kind: part.kind,
      state: 'physics',
      ...(visual.explode ? { explode: visual.explode } : {}),
      ...(visual.isExtra ? { isExtra: true } : {}),
      ...(visual.penalty ? { penalty: visual.penalty } : {}),
      ...(visual.label ? { label: visual.label } : {}),
      ...(visual.notation ? { notation: visual.notation } : {}),
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
    // Spin scales with throw force so harder tosses tumble a little faster.
    const spin = spawn.angular ?? spawn.force * randomBetween(0.3, 0.55);
    const body = this.physics.add(
      id,
      scaledPoints(asset.colliderPoints, DICE_SCALE),
      {
        x: spawn.x,
        y: spawn.y,
        z: spawn.z,
        rotation: {
          x: mesh.quaternion.x,
          y: mesh.quaternion.y,
          z: mesh.quaternion.z,
          w: mesh.quaternion.w,
        },
        ...(spawn.velocity
          ? { linearVelocity: spawn.velocity }
          : {
              impulse: {
                x: Math.cos(spawn.way) * spawn.force,
                y: randomBetween(-0.01, 0.015),
                z: Math.sin(spawn.way) * spawn.force,
              },
            }),
        torque: {
          x: randomBetween(-spin, spin),
          y: randomBetween(-spin, spin),
          z: randomBetween(-spin, spin),
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
      this.processExplosions();
      this.notifySettled();
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
        const spawned = this.processExplosions();
        if (!spawned) this.notifySettled();
        physicsActive = spawned;
      }
    }

    this.animatePulses(time);
    this.renderFrame();
    if (physicsActive) {
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private finishDie(die: RenderedDie): void {
    die.state = 'done';
    die.pulse = undefined;
    die.mesh.scale.setScalar(DICE_SCALE);
    this.restOnFloor(die.mesh);
    die.result = this.readFaceValue(die);
  }

  /** Read the upward face; d4 values live on the face touching the table. */
  private readFaceValue(die: RenderedDie): number {
    const faceDown = die.kind === 'd4';
    let bestValue = 0;
    let bestY = faceDown ? Infinity : -Infinity;
    for (const entry of die.asset.faceEntries) {
      const y = entry.normal.clone().applyQuaternion(die.mesh.quaternion).y;
      if (faceDown ? y < bestY : y > bestY) {
        bestY = y;
        bestValue = entry.value;
      }
    }
    return bestValue;
  }

  private processExplosions(): boolean {
    let spawned = false;
    const results = this.getResults();
    if (results.length === 0) return false;
    for (const result of results) {
      if (!result.explode) continue;
      const max = maxFaceFor(result.sides, result.kind);
      const faceValue = result.value + (result.penalty ?? 0);
      if (faceValue !== max) continue;
      const root = result.rootId ?? result.id;
      const count = this.explosions.get(root) ?? 0;
      if (count >= MAX_EXPLOSIONS) continue;
      const parentDice = [...this.dice.values()].filter(
        (die) => die.visualId === result.id,
      );
      // A physical die may explode only once per throw; its extra die can
      // chain if that extra also rolls the maximum.
      if (parentDice.length === 0 || parentDice.some((die) => die.exploded)) {
        continue;
      }
      for (const die of parentDice) {
        die.pulse = { start: performance.now(), duration: 190 };
      }
      const position =
        parentDice[0].mesh.position.clone() ?? new THREE.Vector3(0, 0.4, 0);
      const extra: DiceVisual = {
        id: `${root}:x${count + 1}`,
        sides: result.sides,
        ...(result.kind ? { kind: result.kind } : {}),
        explode: result.explode,
        isExtra: true,
        rootId: root,
        ...(result.explode === '!p' ? { penalty: 1 } : {}),
        ...(result.label ? { label: result.label } : {}),
        ...(result.notation ? { notation: result.notation } : {}),
      };
      const parts = visualDiceForSides(extra.sides, extra.kind);
      for (let index = 0; index < parts.length; index += 1) {
        if ((this.options?.maxDice ?? 80) <= this.dice.size) break;
        this.addDie(
          extra,
          parts[index],
          this.explosionSpawn(position, parts.length, index),
        );
      }
      for (const die of parentDice) die.exploded = true;
      this.explosions.set(root, count + 1);
      // Each explosion wave gets its own simulation window.
      this.animationStarted = performance.now();
      spawned = true;
    }
    return spawned;
  }

  /**
   * New throws can knock settled dice, so they must participate in the next
   * simulation and have their faces re-read afterwards.
   */
  private wakeSettledDice(): void {
    for (const die of this.dice.values()) {
      if (die.state !== 'done') continue;
      die.state = 'physics';
      die.result = undefined;
    }
  }

  /** Launch an extra die out of the parent with a real physics velocity. */
  private explosionSpawn(
    parent: THREE.Vector3,
    count: number,
    index: number,
  ): SpawnPlan {
    const baseAngle = Math.random() * Math.PI * 2;
    const angle = baseAngle + (index - (count - 1) / 2) * 0.4;
    const speed = randomBetween(1.4, 2.6);
    return {
      x: parent.x + Math.cos(angle) * 0.18,
      z: parent.z + Math.sin(angle) * 0.18,
      y: Math.max(0.4, parent.y + 0.22),
      way: angle,
      force: speed,
      velocity: {
        x: Math.cos(angle) * speed,
        y: randomBetween(1, 1.8),
        z: Math.sin(angle) * speed,
      },
      angular: randomBetween(0.08, 0.18),
    };
  }

  private animatePulses(time: number): void {
    for (const die of this.dice.values()) {
      if (!die.pulse) continue;
      const progress = (time - die.pulse.start) / die.pulse.duration;
      if (progress >= 1) {
        die.pulse = undefined;
        die.mesh.scale.setScalar(DICE_SCALE);
      } else {
        const scale = DICE_SCALE * (1 + 0.22 * Math.sin(progress * Math.PI));
        die.mesh.scale.setScalar(scale);
      }
    }
  }

  private notifySettled(): void {
    if (this.settledNotified) return;
    this.settledNotified = true;
    // A collision may have changed a previously settled die without changing
    // its bookkeeping state; reread every visible face.
    for (const die of this.dice.values()) {
      if (die.state === 'done') die.result = this.readFaceValue(die);
    }
    this.options?.onSettled?.(this.getResults());
  }

  private pointerRay(clientX: number, clientY: number): THREE.Raycaster | null {
    if (!this.renderer) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    return raycaster;
  }

  private pickDie(clientX: number, clientY: number): RenderedDie | null {
    const raycaster = this.pointerRay(clientX, clientY);
    if (!raycaster) return null;
    const meshes = [...this.dice.values()]
      .filter((die) => die.result !== undefined && die.state === 'done')
      .map((die) => die.mesh);
    const hit = raycaster.intersectObjects(meshes, false)[0]?.object;
    if (!hit) return null;
    return [...this.dice.values()].find((entry) => entry.mesh === hit) ?? null;
  }

  private pointerOnDragPlane(
    clientX: number,
    clientY: number,
  ): THREE.Vector3 | null {
    const raycaster = this.pointerRay(clientX, clientY);
    if (!raycaster) return null;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
    const point = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, point) ? point : null;
  }

  private restOnFloor(mesh: THREE.Mesh, lift = 0.001): void {
    mesh.position.y = 0;
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    mesh.position.y = -box.min.y + lift;
  }

  /**
   * Zoom out enough that the whole tray, including airborne dice, stays in
   * view for the current aspect ratio.
   */
  private fitCamera(width: number, height: number): void {
    const aspect = Math.max(0.2, width / Math.max(1, height));
    const halfV = Math.tan((this.camera.fov * Math.PI) / 360);
    const maxDiceHeight = 2.6;
    const zBound = PLAY_BOUNDS.z + 0.5;
    const xBound = PLAY_BOUNDS.x + 0.45;
    const heightForZ = zBound / halfV + maxDiceHeight;
    const heightForX = xBound / (halfV * aspect) + maxDiceHeight;
    const distance = Math.max(heightForZ, heightForX) * 1.06;
    this.camera.position.set(0, distance, 0);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, 0, 0);
  }

  private renderFrame(): void {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }
}
