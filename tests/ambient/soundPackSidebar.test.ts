import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  storedPacks: [] as any[],
  selectedPackId: null as string | null,
  selectPack: vi.fn(),
  deletePack: vi.fn(),
  importPack: vi.fn(),
}));

const confirmMock = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('@/dialogs', () => ({ confirm: confirmMock }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const packs = [
  { id: 'pack-1', name: 'Forest', category: 'fantasy' },
  { id: 'pack-2', name: 'City', category: 'modern' },
] as any[];

describe('SoundPackSidebar', () => {
  beforeEach(() => {
    storeMock.storedPacks = packs;
    storeMock.selectedPackId = null;
    for (const fn of [
      storeMock.selectPack,
      storeMock.deletePack,
      storeMock.importPack,
      confirmMock,
      push,
    ]) {
      fn.mockClear();
    }
    confirmMock.mockResolvedValue(true);
  });

  it('lists all packages plus the all-packages entry', () => {
    const wrapper = mount(SoundPackSidebar, { global: { stubs: quasarStubs } });
    const items = wrapper.findAll('.sound-pack-item');
    expect(items).toHaveLength(3);
    expect(items[0].text()).toContain('All packages');
    expect(items[1].text()).toContain('Forest');
    expect(items[2].text()).toContain('City');
    wrapper.unmount();
  });

  it('filters by package and clears the filter from All packages', async () => {
    const wrapper = mount(SoundPackSidebar, { global: { stubs: quasarStubs } });
    const items = wrapper.findAll('.sound-pack-item');

    await items[1].trigger('click');
    expect(storeMock.selectPack).toHaveBeenCalledWith('pack-1');

    await items[0].trigger('click');
    expect(storeMock.selectPack).toHaveBeenCalledWith(null);
    wrapper.unmount();
  });

  it('marks the selected package and supports deletion', async () => {
    storeMock.selectedPackId = 'pack-2';
    const wrapper = mount(SoundPackSidebar, { global: { stubs: quasarStubs } });
    const items = wrapper.findAll('.sound-pack-item');
    expect(items[2].classes()).toContain('is-selected');

    await items[2].find('.sound-pack-delete').trigger('click');
    expect(confirmMock).toHaveBeenCalled();
    expect(storeMock.deletePack).toHaveBeenCalledWith('pack-2');
    wrapper.unmount();
  });

  it('navigates to the package editor', async () => {
    const wrapper = mount(SoundPackSidebar, { global: { stubs: quasarStubs } });
    const create = wrapper
      .findAll('[data-stub="QItem"]')
      .find((item) => item.text().includes('Create Pack'));
    await create!.trigger('click');
    expect(push).toHaveBeenCalledWith('/ambient-sound/editor');
    wrapper.unmount();
  });

  it('opens the file picker and imports a selected archive', async () => {
    const click = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});
    const wrapper = mount(SoundPackSidebar, { global: { stubs: quasarStubs } });
    const importItem = wrapper
      .findAll('[data-stub="QItem"]')
      .find((item) => item.text().includes('Import Pack'));
    await importItem!.trigger('click');
    expect(click).toHaveBeenCalled();

    const fileInput = wrapper.find('input[type=file]');
    const file = new File(['pack'], 'pack.spk');
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [file],
    });
    await fileInput.trigger('change');
    expect(storeMock.importPack).toHaveBeenCalledWith(file);
    click.mockRestore();
    wrapper.unmount();
  });

  it('renders the all-packages entry when empty', () => {
    storeMock.storedPacks = [];
    const wrapper = mount(SoundPackSidebar, { global: { stubs: quasarStubs } });
    expect(wrapper.findAll('.sound-pack-item')).toHaveLength(1);
    expect(wrapper.text()).toContain('Import Pack');
    wrapper.unmount();
  });
});
