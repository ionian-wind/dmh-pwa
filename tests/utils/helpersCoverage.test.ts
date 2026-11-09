import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from 'quasar';
import { alert } from '@/dialogs/alert';
import { Seq } from '@/utils/dice-probability-calculator/seq';
import { rng, getRandomInt } from '@/utils/random';
import {
  createEmptyRepositories,
  createRollEngine,
  rollDie,
  rollError,
  rollWarning,
  RollFailure,
  sequenceRng,
} from '@/utils/bag-of-dice';
import {
  extractImageMetadata,
  extractImageMetadataFromUrl,
} from '@/maps/utils/imageWorker';

vi.mock('@/utils/debug', () => ({
  debug: vi.fn(),
  debugError: vi.fn(),
}));

describe('helper coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves alert dialogs and merges options', async () => {
    const create = vi.mocked(Dialog.create);
    create.mockImplementationOnce((options: any) => {
      const api: any = {
        onOk(callback: () => void) {
          callback();
          return api;
        },
      };
      return api;
    });

    await expect(
      alert('Hello', { title: 'Title', okText: 'Yes', color: 'negative' }),
    ).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello',
        title: 'Title',
        ok: { label: 'Yes', color: 'negative' },
      }),
    );
  });

  it('exposes deterministic random helpers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
    expect(rng()).toBe(0.42);
    expect(getRandomInt(10)).toBe(4);
  });

  it('implements sequence helpers', () => {
    const seq = new Seq([3, 1, 2]);
    expect(seq.isEmpty).toBe(false);
    expect(new Seq([]).isEmpty).toBe(true);
    expect(seq.get(0)).toBe(0);
    expect(seq.get(1)).toBe(3);
    expect(seq.get(99)).toBe(0);
    expect(seq.contains(2)).toBe(true);
    expect(seq.count([1, 1, 2])).toBe(3);
    expect(seq.toArray()).toEqual([3, 1, 2]);
    expect(seq.toString()).toBe('{3, 1, 2}');
    expect(seq.reverse().toArray()).toEqual([2, 1, 3]);
    expect(Seq.ordered([3, 1, 2], 'highest first').toArray()).toEqual([
      3, 2, 1,
    ]);
  });

  it('rolls and explodes dice for every comparison operator', async () => {
    const engine = createRollEngine();
    const repositories = createEmptyRepositories();
    expect(rollDie(sequenceRng([0.5]), 6)).toBe(4);

    const pool = await engine.roll('2d6', {
      repositories,
      rng: sequenceRng([0.5, 0.5]),
    });
    expect(pool.status).toBe('complete');
    if (pool.status === 'complete') {
      expect(
        pool.result.breakdown.groups[0].dice.map((die) => die.value),
      ).toEqual([4, 4]);
    }

    for (const operator of ['>', '<', '>=', '<=', '=', '!=']) {
      const result = await engine.roll(`1d6!${operator}3`, {
        repositories,
        rng: sequenceRng([0.9, 0.9, 0.9]),
      });
      expect(result.status).toBe('complete');
    }

    const capped = await engine.roll('1d6!', {
      repositories,
      rng: sequenceRng([0.9, 0.9, 0.9]),
      maxExplosionRolls: 1,
    });
    expect(capped.status).toBe('complete');
    if (capped.status === 'complete') {
      expect(
        capped.result.warnings.some(
          (warning) => warning.code === 'LIMIT_EXPLOSION',
        ),
      ).toBe(true);
    }
  });

  it('constructs dice engine errors', () => {
    const error = rollError('PARSE_UNKNOWN_TOKEN', 'base', { pass: 'parse' });
    expect(error).toMatchObject({
      code: 'PARSE_UNKNOWN_TOKEN',
      message: 'base',
      pass: 'parse',
    });
    const failure = new RollFailure(error);
    expect(failure.errors[0].code).toBe('PARSE_UNKNOWN_TOKEN');
    expect(rollWarning('MISSING_DATA', 'careful').message).toBe('careful');
  });

  it('extracts image metadata through workers', async () => {
    class FakeWorker {
      static instances: FakeWorker[] = [];
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      terminate = vi.fn();
      postMessage = vi.fn();
      constructor() {
        FakeWorker.instances.push(this);
      }
    }
    vi.stubGlobal('Worker', FakeWorker as any);

    const success = extractImageMetadata(new File(['x'], 'x.png'));
    FakeWorker.instances.at(-1)!.onmessage!({
      data: {
        type: 'success',
        metadata: { width: 10, height: 20, aspectRatio: 0.5 },
      },
    } as MessageEvent);
    await expect(success).resolves.toMatchObject({ width: 10, height: 20 });

    const failure = extractImageMetadata(new File(['x'], 'x.png'));
    FakeWorker.instances.at(-1)!.onmessage!({
      data: { type: 'error', error: 'bad image' },
    } as MessageEvent);
    await expect(failure).rejects.toThrow('bad image');

    const workerFailure = extractImageMetadata(new File(['x'], 'x.png'));
    FakeWorker.instances.at(-1)!.onerror!({} as ErrorEvent);
    await expect(workerFailure).rejects.toBeDefined();

    const urlFailure = extractImageMetadataFromUrl('blob:image');
    FakeWorker.instances.at(-1)!.onerror!({} as ErrorEvent);
    await expect(urlFailure).rejects.toBeDefined();

    const urlMessageFailure = extractImageMetadataFromUrl('blob:image');
    FakeWorker.instances.at(-1)!.onmessage!({
      data: { type: 'error', error: 'bad url image' },
    } as MessageEvent);
    await expect(urlMessageFailure).rejects.toThrow('bad url image');

    const urlSuccess = extractImageMetadataFromUrl('blob:image');
    FakeWorker.instances.at(-1)!.onmessage!({
      data: {
        type: 'success',
        metadata: { width: 1, height: 1, aspectRatio: 1 },
      },
    } as MessageEvent);
    await expect(urlSuccess).resolves.toMatchObject({ width: 1 });
    vi.unstubAllGlobals();
  });
});
