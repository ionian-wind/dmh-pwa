import RAPIER from '@dimforge/rapier3d-compat';

export interface DiceSpawn {
  x: number;
  y: number;
  z: number;
  rotation?: { x: number; y: number; z: number; w: number };
  impulse?: { x: number; y: number; z: number };
  torque?: { x: number; y: number; z: number };
}

export interface DiceTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}

export interface DiceBody {
  id: string;
  body: RAPIER.RigidBody;
}

/** Thin lifecycle wrapper around a Rapier world. All motion is cosmetic. */
export class RapierDiceWorld {
  private world: RAPIER.World | null = null;
  private bodies = new Map<string, DiceBody>();
  private initPromise: Promise<void> | null = null;

  async init(gravityY = -9.81): Promise<void> {
    if (this.world) return;
    if (!this.initPromise) {
      this.initPromise = RAPIER.init().then(() => {
        this.world = new RAPIER.World({ x: 0, y: gravityY, z: 0 });
        const floorBody = this.world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.05, 0),
        );
        this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(30, 0.05, 30)
            .setFriction(0.9)
            .setRestitution(0.05),
          floorBody,
        );
        // Invisible walls keep cosmetic tumbling inside the camera frame.
        const wall = (x: number, z: number, halfX: number, halfZ: number) => {
          const body = this.world!.createRigidBody(
            RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.55, z),
          );
          this.world!.createCollider(
            RAPIER.ColliderDesc.cuboid(halfX, 0.55, halfZ)
              .setFriction(0.4)
              .setRestitution(0.1),
            body,
          );
        };
        wall(-3.6, 0, 0.08, 2.6);
        wall(3.6, 0, 0.08, 2.6);
        wall(0, -2.6, 3.6, 0.08);
        wall(0, 2.6, 3.6, 0.08);
      });
    }
    await this.initPromise;
  }

  get ready(): boolean {
    return this.world !== null;
  }

  add(
    id: string,
    points: Float32Array,
    spawn: DiceSpawn,
    mass = 0.1,
  ): DiceBody | null {
    if (!this.world) return null;
    const existing = this.bodies.get(id);
    if (existing) this.remove(id);

    const descriptor = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawn.x, spawn.y, spawn.z)
      .setCcdEnabled(true)
      .setLinearDamping(0.35)
      .setAngularDamping(0.45);
    if (spawn.rotation) {
      descriptor.setRotation(spawn.rotation);
    }
    const body = this.world.createRigidBody(descriptor);

    const hull = RAPIER.ColliderDesc.convexHull(points);
    const collider = hull ?? RAPIER.ColliderDesc.ball(0.13);
    collider.setFriction(0.75).setRestitution(0.08).setMass(mass);
    this.world.createCollider(collider, body);

    if (spawn.impulse) body.applyImpulse(spawn.impulse, true);
    if (spawn.torque) body.applyTorqueImpulse(spawn.torque, true);

    const handle: DiceBody = { id, body };
    this.bodies.set(id, handle);
    return handle;
  }

  remove(id: string): void {
    const entry = this.bodies.get(id);
    if (!entry) return;
    this.world?.removeRigidBody(entry.body);
    this.bodies.delete(id);
  }

  clear(): void {
    for (const id of [...this.bodies.keys()]) this.remove(id);
  }

  step(deltaSeconds: number): void {
    if (!this.world) return;
    this.world.timestep = Math.min(Math.max(deltaSeconds, 1 / 240), 1 / 30);
    this.world.step();
  }

  /** True while at least one body is still moving. */
  get active(): boolean {
    for (const { body } of this.bodies.values()) {
      if (!body.isSleeping()) return true;
    }
    return false;
  }

  transform(id: string): DiceTransform | undefined {
    const body = this.bodies.get(id)?.body;
    if (!body) return undefined;
    const position = body.translation();
    const rotation = body.rotation();
    return {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        w: rotation.w,
      },
    };
  }

  dispose(): void {
    this.clear();
    this.world?.free();
    this.world = null;
    this.initPromise = null;
  }
}
