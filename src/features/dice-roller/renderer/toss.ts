export interface TossPoint {
  x: number;
  z: number;
}

export interface TossSample {
  point: TossPoint;
  time: number;
}

export interface TossRelease {
  /** Initial horizontal velocity in world units/second. */
  vx: number;
  vz: number;
  /** Clamped throw speed used for spin scaling. */
  speed: number;
  /** Cosmetic angular impulse magnitude. */
  spin: number;
}

const MAX_SPEED = 7;
const MAX_IDLE_MS = 110;

/** Derive a toss from the last cursor samples. Stopping before release drops. */
export function computeTossRelease(
  samples: readonly TossSample[],
  now: number,
  maxSpeed = MAX_SPEED,
  maxIdleMs = MAX_IDLE_MS,
): TossRelease {
  if (samples.length < 2) {
    return { vx: 0, vz: 0, speed: 0, spin: 0 };
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const idle = Math.max(0, now - last.time);
  if (idle > maxIdleMs) {
    return { vx: 0, vz: 0, speed: 0, spin: 0 };
  }

  const seconds = Math.max((last.time - first.time) / 1000, 1 / 240);
  const decay = Math.max(0, 1 - idle / maxIdleMs);
  const rawVx = ((last.point.x - first.point.x) / seconds) * decay;
  const rawVz = ((last.point.z - first.point.z) / seconds) * decay;
  const rawSpeed = Math.hypot(rawVx, rawVz);
  if (rawSpeed === 0) {
    return { vx: 0, vz: 0, speed: 0, spin: 0 };
  }

  const scale = Math.min(1, maxSpeed / rawSpeed);
  const vx = rawVx * scale;
  const vz = rawVz * scale;
  const speed = rawSpeed * scale;
  return {
    vx,
    vz,
    speed,
    // Faster tosses tumble a little more, but stay gentle enough to read.
    spin: Math.min(speed * 0.018, 0.12),
  };
}

/** Keep only recent samples so release velocity reflects the latest motion. */
export function trimTossSamples(
  samples: TossSample[],
  now: number,
  windowMs = 150,
): TossSample[] {
  while (samples.length > 0 && now - samples[0].time > windowMs) {
    samples.shift();
  }
  return samples;
}
