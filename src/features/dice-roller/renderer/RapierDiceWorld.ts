import RAPIER from '@dimforge/rapier3d-compat';

export interface DiceSpawn {
  x: number;
  y: number;
  z: number;
  rotation?: { x: number; y: number; z: number; w: number };
  impulse?: { x: number; y: number; z: number };
  linearVelocity?: { x: number; y: number; z: number };
  torque?: { x: number; y: number; z: number };
}

export interface DiceTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}

export interface DiceBody {
  id: string;
  body: RAPIER.RigidBody;
  colliders: number[];
}

/** Thin lifecycle wrapper around a Rapier world. All motion is cosmetic. */
export class RapierDiceWorld {
  private world: RAPIER.World | null = null;
  private bodies = new Map<string, DiceBody>();
  private colliderBodies = new Map<number, RAPIER.RigidBody>();
  private eventQueue: RAPIER.EventQueue | null = null;
  private initPromise: Promise<void> | null = null;

  async init(gravityY = -9.81): Promise<void> {
    if (this.world) return;
    if (!this.initPromise) {
      this.initPromise = RAPIER.init().then(() => {
        this.world = new RAPIER.World({ x: 0, y: gravityY, z: 0 });
        this.eventQueue = new RAPIER.EventQueue(true);
        const floorBody = this.world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.05, 0),
        );
        this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(30, 0.05, 30)
            .setFriction(0.7)
            .setRestitution(0.3),
          floorBody,
        );
        // Invisible walls keep cosmetic tumbling inside the camera frame.
        const wall = (x: number, z: number, halfX: number, halfZ: number) => {
          const body = this.world!.createRigidBody(
            RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.55, z),
          );
          this.world!.createCollider(
            RAPIER.ColliderDesc.cuboid(halfX, 0.55, halfZ)
              .setFriction(0.35)
              .setRestitution(0.55),
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
      .setAngularDamping(0.6);
    if (spawn.rotation) {
      descriptor.setRotation(spawn.rotation);
    }
    const body = this.world.createRigidBody(descriptor);

    const hull = RAPIER.ColliderDesc.convexHull(points);
    const collider = hull ?? RAPIER.ColliderDesc.ball(0.13);
    collider
      .setFriction(0.7)
      .setRestitution(0.25)
      .setMass(mass)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const created = this.world.createCollider(collider, body);
    this.colliderBodies.set(created.handle, body);

    if (spawn.impulse) body.applyImpulse(spawn.impulse, true);
    if (spawn.linearVelocity) {
      body.setLinvel(spawn.linearVelocity, true);
    }
    if (spawn.torque) body.applyTorqueImpulse(spawn.torque, true);

    const handle: DiceBody = { id, body, colliders: [created.handle] };
    this.bodies.set(id, handle);
    return handle;
  }

  remove(id: string): void {
    const entry = this.bodies.get(id);
    if (!entry) return;
    for (const handle of entry.colliders) this.colliderBodies.delete(handle);
    this.world?.removeRigidBody(entry.body);
    this.bodies.delete(id);
  }

  clear(): void {
    for (const id of [...this.bodies.keys()]) this.remove(id);
  }

  step(deltaSeconds: number): void {
    if (!this.world) return;
    this.world.timestep = Math.min(Math.max(deltaSeconds, 1 / 240), 1 / 30);
    this.world.step(this.eventQueue ?? undefined);
    this.eventQueue?.drainCollisionEvents((first, second, started) => {
      if (!started) return;
      const bodyA = this.colliderBodies.get(first);
      const bodyB = this.colliderBodies.get(second);
      for (const body of [bodyA, bodyB]) {
        if (!body) continue;
        // Every impact loses a little energy: linear a bit, spin a bit more.
        const velocity = body.linvel();
        body.setLinvel(
          {
            x: velocity.x * 0.95,
            y: velocity.y * 0.95,
            z: velocity.z * 0.95,
          },
          true,
        );
        const spin = body.angvel();
        body.setAngvel(
          { x: spin.x * 0.9, y: spin.y * 0.9, z: spin.z * 0.9 },
          true,
        );
      }
    });
  }

  /** True while at least one body is still moving. */
  get active(): boolean {
    for (const { body } of this.bodies.values()) {
      if (!body.isSleeping()) return true;
    }
    return false;
  }

  /**
   * True only once every body has stopped bouncing and Rapier has slept it.
   * The visual correction runs after this point, never while dice still move.
   */
  get settleReady(): boolean {
    return !this.active;
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
    this.eventQueue = null;
    this.colliderBodies.clear();
    this.initPromise = null;
  }
}
