import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  storedPacks: [] as any[],
  currentPack: null as any,
  importPack: vi.fn().mockResolvedValue(undefined),
}));

const push = vi.hoisted(() => vi.fn());

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';

function control(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper
    .findAll('[data-stub="QItem"]')
    .find((entry) => entry.text() === text);
}

describe('SoundPackSidebar', () => {
  beforeEach(() => {
    storeMock.storedPacks = [];
    storeMock.currentPack = null;
    storeMock.importPack.mockClear();
    push.mockClear();
  });

  it('opens the pack editor and hints when the library is empty', () => {
    const wrapper = mount(SoundPackSidebar, {
      global: { stubs: { SoundPackSelector: true } },
    });

    expect(wrapper.text()).toContain('Sound packs');
    expect(wrapper.text()).toContain('Import a .spk sound pack file');
    expect(wrapper.find('.sound-pack-sidebar-controls').exists()).toBe(true);
    expect(wrapper.findAll('[data-stub="QSeparator"]')).toHaveLength(1);
    expect(control(wrapper, 'Create Pack')).toBeTruthy();
    expect(control(wrapper, 'Import Pack')).toBeTruthy();

    control(wrapper, 'Create Pack')!.trigger('click');
    expect(push).toHaveBeenCalledWith('/ambient-sound/editor');
    wrapper.unmount();
  });

  it('imports a selected .spk file', async () => {
    storeMock.storedPacks = [{ id: 'p1', name: 'Pack' }];
    const wrapper = mount(SoundPackSidebar, {
      global: { stubs: { SoundPackSelector: true } },
    });

    expect(wrapper.text()).not.toContain('Import a .spk sound pack file');
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
    expect((input.element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });
});
