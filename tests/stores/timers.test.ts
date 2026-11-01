import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { Notify } from 'quasar';

import { useTimerStore } from '@/stores/timers';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('timer store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    resetMockStores();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('finishes expired timers, polls running timers, stops and resets', async () => {
    const store = useTimerStore();
    const now = Date.now();

    const expired = await store.create({
      title: 'Expired',
      duration: 1000,
      startedAt: now - 5000,
      status: 'running',
    } as any);

    await store.init();
    expect(store.getById(expired.id)?.status).toBe('finished');
    expect(Notify.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'timers.finished: Expired',
      }),
    );

    const running = await store.create({
      title: 'Running',
      duration: 500,
      startedAt: null,
      status: 'inactive',
    } as any);

    await store.start(running.id);
    expect(store.getById(running.id)?.status).toBe('running');
    expect(store.getById(running.id)?.startedAt).toBe(now);
    expect(store.running).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(store.getById(running.id)?.status).toBe('finished');
    expect(store.running).toBe(false);

    const stopped = await store.create({
      title: 'Stopped',
      duration: 5000,
      startedAt: null,
      status: 'inactive',
    } as any);
    await store.start(stopped.id);
    await store.stop(stopped.id);
    expect(store.getById(stopped.id)?.status).toBe('inactive');
    expect(store.getById(stopped.id)?.startedAt).toBeNull();

    const reset = await store.create({
      title: 'Reset',
      duration: 5000,
      startedAt: null,
      status: 'inactive',
    } as any);
    await store.reset(reset.id);
    expect(store.getById(reset.id)?.status).toBe('running');
    expect(store.timers).toHaveLength(4);
    expect(typeof store.now).toBe('number');
  });

  it('does not restart a timer that is already running or stop an inactive one', async () => {
    const store = useTimerStore();
    const timer = await store.create({
      title: 'One',
      duration: 1000,
      startedAt: null,
      status: 'inactive',
    } as any);

    await store.start(timer.id);
    const startedAt = store.getById(timer.id)?.startedAt;
    await store.start(timer.id);
    expect(store.getById(timer.id)?.startedAt).toBe(startedAt);

    await store.stop(timer.id);
    await store.stop(timer.id);
    expect(store.getById(timer.id)?.status).toBe('inactive');
  });
});
