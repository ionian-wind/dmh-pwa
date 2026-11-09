import * as THREE from 'three';
import type {
  DiceRenderer,
  DiceRendererOptions,
  DiceVisual,
} from './DiceRenderer';
import {
  loadDiceAssets,
  type DiceAsset,
  type DiceAssetSet,
} from './assetLoader';
import { visualDiceFor, type VisualDiePart } from './diceValues';
import { cosmeticSpin, targetQuaternion } from './faceOrientation';
import { RapierDiceWorld } from './RapierDiceWorld';
import { loadDiceMaterials, type DiceMaterialSet } from './themeLoader';
import { hasSimulationTimedOut, SETTLE_MS } from './timing';

const DICE_SCALE = 1.7;

interface RenderedDie {
  id: string;
  mesh: THREE.Mesh;
  asset: DiceAsset;
  value: number;
  faceValue: number;
  target: THREE.Quaternion;
  state: 'physics' | 'settling' | 'done';
  settleFrom?: THREE.Quaternion;
  settleFromY?: number;
  settleStart?: number;
}

function deterministicUnit(id: string, salt: number): number {
  return cosmeticSpin(`${id}:${salt}`, salt) / (Math.PI * 2);
}

function scaledPoints(points: Float32Array, scale: number): Float32Array {
  const result = new Float32Array(points.length);
  for (let index = 0; index < points.length; index += 1) {
    result[index] = points[index] * scale;
  }
  return result;
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

    this.camera.position.set(0, 5.4, 7.4);
    this.camera.lookAt(0, 0.3, 0);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const ambient = new THREE.HemisphereLight(0xffffff, 0x777777, 2.2);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(3, 9, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(-4, 5, -3);
    this.scene.add(rim);

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
      for (const part of visualDiceFor(visual)) {
        if (this.dice.size >= max) return;
        this.addDie(part);
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

  private addDie(part: VisualDiePart): void {
    if (!this.assets || !this.materials) return;
    const asset = this.assets.assets.get(part.kind);
    if (!asset) return;
    const material =
      part.kind === 'd2' ? this.materials.extras : this.materials.standard;
    const mesh = new THREE.Mesh(asset.geometry, material);
    mesh.scale.setScalar(DICE_SCALE);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const index = this.dice.size;
    const angle = index * 2.399963;
    const radius = Math.min(0.55 + 0.22 * Math.sqrt(index), 2.8);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * Math.min(radius, 1.8);
    const spawnHeight = 2.4 + (index % 6) * 0.22;
    const target = targetQuaternion(
      asset.faceNormals,
      part.faceValue,
      cosmeticSpin(`${part.id}:target`, part.faceValue),
    );

    mesh.position.set(x, spawnHeight, z);
    this.scene.add(mesh);

    if (this.options?.reducedMotion) {
      mesh.quaternion.copy(target);
      this.restOnFloor(mesh);
      this.dice.set(part.id, {
        id: part.id,
        mesh,
        asset,
        value: part.value,
        faceValue: part.faceValue,
        target,
        state: 'done',
      });
      return;
    }

    const tilt = deterministicUnit(part.id, 1) * Math.PI;
    mesh.quaternion.setFromEuler(
      new THREE.Euler(
        deterministicUnit(part.id, 2) * Math.PI,
        tilt,
        deterministicUnit(part.id, 3) * Math.PI,
      ),
    );
    const body = this.physics.add(
      part.id,
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
          x: (deterministicUnit(part.id, 4) - 0.5) * 0.045,
          y: deterministicUnit(part.id, 5) * 0.015,
          z: (deterministicUnit(part.id, 6) - 0.5) * 0.045,
        },
        torque: {
          x: (deterministicUnit(part.id, 7) - 0.5) * 0.08,
          y: (deterministicUnit(part.id, 8) - 0.5) * 0.08,
          z: (deterministicUnit(part.id, 9) - 0.5) * 0.08,
        },
      },
      0.1,
    );

    this.dice.set(part.id, {
      id: part.id,
      mesh,
      asset,
      value: part.value,
      faceValue: part.faceValue,
      target,
      state: body ? 'physics' : 'settling',
      settleFrom: mesh.quaternion.clone(),
      settleFromY: mesh.position.y,
      settleStart: body ? undefined : performance.now(),
    });
  }

  private startAnimation(): void {
    if (this.frame !== null) return;
    if (typeof requestAnimationFrame !== 'function') {
      for (const die of this.dice.values()) this.finishDie(die);
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
      if (timedOut || !this.physics.active) {
        for (const die of this.dice.values()) {
          if (die.state === 'physics') this.beginSettle(die, time);
        }
      }
    }

    let settling = false;
    for (const die of this.dice.values()) {
      if (die.state !== 'settling') continue;
      settling = true;
      this.advanceSettle(die, time);
    }

    this.renderFrame();
    if (physicsActive || settling) {
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private beginSettle(die: RenderedDie, time: number): void {
    const transform = this.physics.transform(die.id);
    if (transform) {
      die.mesh.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z,
      );
    }
    die.state = 'settling';
    die.settleFrom = die.mesh.quaternion.clone();
    die.settleFromY = die.mesh.position.y;
    die.settleStart = time;
  }

  private advanceSettle(die: RenderedDie, time: number): void {
    const start = die.settleStart ?? time;
    const progress = Math.min(1, (time - start) / SETTLE_MS);
    const eased = 1 - (1 - progress) ** 3;
    if (die.settleFrom) {
      die.mesh.quaternion.copy(die.settleFrom).slerp(die.target, eased);
    } else {
      die.mesh.quaternion.copy(die.target);
    }
    // Work out the resting height for the target orientation.
    die.mesh.position.y = die.settleFromY ?? die.mesh.position.y;
    this.restOnFloor(die.mesh, 0, eased);
    if (progress >= 1) this.finishDie(die);
  }

  private finishDie(die: RenderedDie): void {
    die.state = 'done';
    die.mesh.quaternion.copy(die.target);
    this.restOnFloor(die.mesh);
  }

  private restOnFloor(mesh: THREE.Mesh, lift = 0.001, blend = 1): void {
    const previous = mesh.position.y;
    mesh.position.y = 0;
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const target = -box.min.y + lift;
    mesh.position.y =
      blend >= 1 ? target : previous + (target - previous) * blend;
  }

  private renderFrame(): void {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }
}
