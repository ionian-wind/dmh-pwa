import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  storedPacks: [] as any[],
  currentPack: null as any,
  loadPack: vi.fn().mockResolvedValue(undefined),
  unloadPack: vi.fn(),
  importPack: vi.fn().mockResolvedValue(undefined),
}));

const push = vi.hoisted(() => vi.fn());

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';

const packs = [
  { id: 'p1', name: 'Fantasy Pack', category: 'fantasy' },
  { id: 'p2', name: 'Horror Pack', category: 'horror' },
];

function control(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper
    .findAll('[data-stub="QItem"]')
    .find((entry) => entry.text() === text);
}

describe('SoundPackSidebar', () => {
  beforeEach(() => {
    storeMock.storedPacks = packs;
    storeMock.currentPack = null;
    storeMock.loadPack.mockClear();
    storeMock.unloadPack.mockClear();
    storeMock.importPack.mockClear();
    push.mockClear();
  });

  it('lists packs as sidebar items without a title and loads on click', async () => {
    const wrapper = mount(SoundPackSidebar);
    const items = wrapper.findAll('.sound-pack-item');

    expect(wrapper.text()).not.toContain('Sound packs');
    expect(items.map((item) => item.text())).toContain('Fantasy Pack');
    expect(items.map((item) => item.text())).toContain('Horror Pack');

    await items[0].trigger('click');
    expect(storeMock.loadPack).toHaveBeenCalledWith(packs[0]);
    wrapper.unmount();
  });

  it('marks the active pack and toggles it off on click', async () => {
    storeMock.currentPack = packs[1];
    const wrapper = mount(SoundPackSidebar);
    const items = wrapper.findAll('.sound-pack-item');

    expect(items[1].classes()).toContain('is-selected');
    await items[1].trigger('click');
    expect(storeMock.unloadPack).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('keeps pinned create/import controls and imports files', async () => {
    const wrapper = mount(SoundPackSidebar);

    expect(wrapper.find('.sound-pack-sidebar-controls').exists()).toBe(true);
    expect(wrapper.findAll('[data-stub="QSeparator"]')).toHaveLength(1);
    expect(control(wrapper, 'Create Pack')).toBeTruthy();
    expect(control(wrapper, 'Import Pack')).toBeTruthy();

    control(wrapper, 'Create Pack')!.trigger('click');
    expect(push).toHaveBeenCalledWith('/ambient-sound/editor');

    const click = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);
    control(wrapper, 'Import Pack')!.trigger('click');
    expect(click).toHaveBeenCalled();
    click.mockRestore();

    const input = wrapper.find('input[type="file"]');
    const file = new File(['pack'], 'demo.spk');
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    });
    await input.trigger('change');
    await flushPromises();
    expect(storeMock.importPack).toHaveBeenCalledWith(file);
    wrapper.unmount();
  });

  it('shows the import hint when the library is empty', () => {
    storeMock.storedPacks = [];
    const wrapper = mount(SoundPackSidebar);

    expect(wrapper.text()).toContain('Import a .spk sound pack file');
    expect(wrapper.findAll('.sound-pack-item')).toHaveLength(0);
    wrapper.unmount();
  });
});
