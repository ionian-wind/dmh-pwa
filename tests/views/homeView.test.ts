import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { h } from 'vue';

import HomeView from '@/views/HomeView.vue';
import { alert } from '@/dialogs';
import { backupAllStores, restoreAllStores } from '@/utils/storage';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';

const mocks = vi.hoisted(() => ({
  backup: vi.fn(),
  restore: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('@/utils/storage', async () => {
  const helper = await import('../helpers/mock-storage');
  return {
    ...helper,
    backupAllStores: mocks.backup,
    restoreAllStores: mocks.restore,
  };
});

vi.mock('@/dialogs', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn(),
  prompt: vi.fn(),
}));

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => h('div') } },
      { path: '/notes', component: { render: () => h('div') } },
      { path: '/parties', component: { render: () => h('div') } },
      { path: '/pawns', component: { render: () => h('div') } },
      { path: '/encounters', component: { render: () => h('div') } },
      { path: '/characters', component: { render: () => h('div') } },
      { path: '/locations', component: { render: () => h('div') } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount(HomeView, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe('HomeView', () => {
  beforeEach(() => {
    resetMockStores();
    vi.clearAllMocks();
    vi.mocked(alert).mockResolvedValue(undefined);
    (URL as any).createObjectURL = vi.fn(() => 'blob:backup');
    (URL as any).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: mocks.reload },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows stats from all stores', async () => {
    seedMockStore('notes', [
      { id: 'n1', title: 'Visible' },
      { id: 'n2', title: 'Second' },
    ]);
    seedMockStore('characters', [{ id: 'c1', name: 'Hero' }]);
    seedMockStore('parties', [{ id: 'p1', name: 'Party' }]);
    seedMockStore('pawns', [{ id: 'm1', name: 'Pawn' }]);
    seedMockStore('encounters', [{ id: 'e1', name: 'Encounter' }]);
    seedMockStore('map_locations', [{ id: 'l1', name: 'Location' }]);

    const wrapper = await mountHome();
    expect(wrapper.findAll('.stat-card')).toHaveLength(6);
    expect(
      wrapper.findAll('.stat-card h3').map((title) => title.text()),
    ).toEqual([
      'Notes',
      'Pawns',
      'Encounters',
      'Locations',
      'Characters',
      'Parties',
    ]);
    expect(wrapper.findAll('.stat-icon svg')).toHaveLength(6);
    expect(wrapper.text()).toContain('2');
    wrapper.unmount();
  });

  it('backs up stores and cleans up the download link', async () => {
    vi.useFakeTimers();
    vi.mocked(backupAllStores).mockResolvedValue(new Blob(['zip']));
    const wrapper = await mountHome();

    await (wrapper.vm as any).handleBackup();
    expect(backupAllStores).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(document.body.querySelector('a[download]')).toBeNull();
    wrapper.unmount();
  });

  it('reports backup failures', async () => {
    vi.mocked(backupAllStores).mockRejectedValue(new Error('disk'));
    const wrapper = await mountHome();

    await (wrapper.vm as any).handleBackup();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('disk'));
    wrapper.unmount();
  });

  it('restores stores from an input file and reloads', async () => {
    vi.mocked(restoreAllStores).mockResolvedValue(undefined);
    const wrapper = await mountHome();
    const input = { files: [new File(['zip'], 'backup.zip')], value: 'x' };

    await (wrapper.vm as any).handleRestore({ target: input } as any);
    expect(restoreAllStores).toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
    expect(mocks.reload).toHaveBeenCalled();
    expect(input.value).toBe('');
    wrapper.unmount();
  });

  it('ignores restore with no file and reports restore failures', async () => {
    const wrapper = await mountHome();
    await (wrapper.vm as any).handleRestore({
      target: { files: [], value: '' },
    } as any);
    expect(restoreAllStores).not.toHaveBeenCalled();

    vi.mocked(restoreAllStores).mockRejectedValue(new Error('corrupt'));
    await (wrapper.vm as any).handleRestore({
      target: { files: [new File(['x'], 'bad.zip')], value: '' },
    } as any);
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('corrupt'));
    wrapper.unmount();
  });
});
