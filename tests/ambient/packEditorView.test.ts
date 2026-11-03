import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  confirm: vi.fn(),
  pickAudioFiles: vi.fn(),
  isSupported: vi.fn(),
  saveSoundPack: vi.fn(),
  exportSoundPackAsFile: vi.fn(),
}));

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/dialogs', () => ({ confirm: mocks.confirm }));
vi.mock('@/utils/files', () => ({
  fileHandler: {
    isSupported: mocks.isSupported,
    pickAudioFiles: mocks.pickAudioFiles,
  },
}));
vi.mock('@/ambient-sound/utils/packManager', () => ({
  saveSoundPack: mocks.saveSoundPack,
  exportSoundPackAsFile: mocks.exportSoundPackAsFile,
}));

import PackEditorView from '@/ambient-sound/PackEditorView.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const QInput = quasarStubs.QInput;
const QSelect = quasarStubs.QSelect;

function audio(fileName: string) {
  return {
    file: new File(['audio'], fileName, { type: 'audio/mpeg' }),
    source: { kind: 'blob', blob: new Blob(['audio']) },
  };
}

function buttons(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').filter((entry) => entry.text() === text);
}

function button(wrapper: ReturnType<typeof mount>, text: string) {
  return buttons(wrapper, text)[0];
}

describe('PackEditorView package management', () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockReset();
    mocks.isSupported.mockReturnValue(true);
    mocks.confirm.mockResolvedValue(true);
    mocks.saveSoundPack.mockResolvedValue(undefined);
    mocks.exportSoundPackAsFile.mockResolvedValue(undefined);
    mocks.pickAudioFiles.mockResolvedValue([audio('sound.mp3')]);
  });

  it('creates layers with variations, effects and mood music', async () => {
    const wrapper = mount(PackEditorView);

    await wrapper
      .findAllComponents(QInput)[0]
      .vm.$emit('update:modelValue', 'Demo pack');
    await nextTick();

    expect(buttons(wrapper, 'Add')).toHaveLength(2);
    await buttons(wrapper, 'Add')[0].trigger('click');
    await nextTick();
    await buttons(wrapper, 'Add')[1].trigger('click');
    await nextTick();

    await button(wrapper, 'Add variation').trigger('click');
    await nextTick();
    expect(buttons(wrapper, 'Add sample')).toHaveLength(2);
    await buttons(wrapper, 'Add sample')[0].trigger('click');
    await nextTick();
    await buttons(wrapper, 'Add sample')[1].trigger('click');
    await nextTick();

    await button(wrapper, 'Select file').trigger('click');
    await buttons(wrapper, 'Add music')[0].trigger('click');
    await flushPromises();

    await buttons(wrapper, 'Save')[0].trigger('click');
    await flushPromises();

    expect(mocks.saveSoundPack).toHaveBeenCalledTimes(1);
    const [manifest, audioFiles] = mocks.saveSoundPack.mock.calls[0];
    expect(manifest).toMatchObject({
      id: expect.stringMatching(/^pack_/),
      name: 'Demo pack',
      category: 'fantasy',
      defaultIntensity: 50,
    });
    expect(manifest.layers).toHaveLength(1);
    expect(manifest.layers[0].category).toBe('Ambient');
    expect(manifest.layers[0].variations).toHaveLength(2);
    expect(manifest.layers[0].variations[0].samples).toEqual(['sound.mp3']);
    expect(manifest.oneShots).toHaveLength(1);
    expect(manifest.oneShots[0].file).toBe('sound.mp3');
    expect(manifest.moodStates).toHaveLength(4);
    expect(manifest.moodStates[0].musicFiles).toEqual(['sound.mp3']);
    expect(manifest.moodStates[0].mode).toBe('continual');
    expect(manifest.weatherSystems).toBeUndefined();
    expect([...audioFiles.keys()]).toEqual(
      expect.arrayContaining([
        'layers/sound.mp3',
        'sfx/sound.mp3',
        'music/sound.mp3',
      ]),
    );
    expect(mocks.exportSoundPackAsFile).toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith('/ambient-sound');
    wrapper.unmount();
  });

  it('saves without downloading and supports cancel', async () => {
    mocks.confirm.mockResolvedValue(false);
    const wrapper = mount(PackEditorView);
    await wrapper
      .findAllComponents(QInput)[0]
      .vm.$emit('update:modelValue', 'Demo');
    await nextTick();

    await button(wrapper, 'Save').trigger('click');
    await flushPromises();
    expect(mocks.saveSoundPack).toHaveBeenCalled();
    expect(mocks.exportSoundPackAsFile).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith('/ambient-sound');

    mocks.push.mockClear();
    await button(wrapper, 'Cancel').trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/ambient-sound');
    wrapper.unmount();
  });

  it('adds and removes layer/effect rows', async () => {
    const wrapper = mount(PackEditorView);
    await buttons(wrapper, 'Add')[0].trigger('click');
    await nextTick();
    await buttons(wrapper, 'Add')[1].trigger('click');
    await nextTick();

    expect(wrapper.findAll('.item-card')).toHaveLength(2);
    expect(wrapper.findAll('.mood-state-card')).toHaveLength(4);

    const layer = wrapper.find('.item-card');
    await layer.find('button[aria-label="Delete"]').trigger('click');
    expect(wrapper.findAll('.item-card')).toHaveLength(1);
    wrapper.unmount();
  });

  it('removes variations, samples, effects and mood music', async () => {
    const wrapper = mount(PackEditorView);
    await buttons(wrapper, 'Add')[0].trigger('click');
    await nextTick();
    await buttons(wrapper, 'Add')[1].trigger('click');
    await nextTick();
    await button(wrapper, 'Add variation').trigger('click');
    await nextTick();
    await buttons(wrapper, 'Add sample')[0].trigger('click');
    await nextTick();

    expect(wrapper.findAll('.sample-row')).toHaveLength(1);
    await wrapper
      .find('.sample-row button[aria-label="Delete"]')
      .trigger('click');
    expect(wrapper.findAll('.sample-row')).toHaveLength(0);

    await wrapper
      .findAll('.variation-card')[0]
      .find('button[aria-label="Delete"]')
      .trigger('click');
    expect(wrapper.findAll('.variation-card')).toHaveLength(1);

    await wrapper
      .find('.item-card button[aria-label="Delete"]')
      .trigger('click');
    expect(wrapper.findAll('.item-card')).toHaveLength(1);
    await wrapper
      .find('.item-card button[aria-label="Delete"]')
      .trigger('click');
    expect(wrapper.findAll('.item-card')).toHaveLength(0);
    wrapper.unmount();
  });

  it('removes a mood music file', async () => {
    const wrapper = mount(PackEditorView);
    await buttons(wrapper, 'Add music')[0].trigger('click');
    await flushPromises();

    expect(wrapper.findAll('.mood-state-card .sample-row')).toHaveLength(1);
    await wrapper
      .find('.mood-state-card .sample-row button[aria-label="Delete"]')
      .trigger('click');
    expect(wrapper.findAll('.mood-state-card .sample-row')).toHaveLength(0);
    wrapper.unmount();
  });

  it('does not pick files when the file API is unsupported', async () => {
    mocks.isSupported.mockReturnValue(false);
    const wrapper = mount(PackEditorView);
    await buttons(wrapper, 'Add')[0].trigger('click');
    await button(wrapper, 'Add sample').trigger('click');
    await flushPromises();
    expect(mocks.pickAudioFiles).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('updates pack metadata and handles download failures', async () => {
    mocks.exportSoundPackAsFile.mockRejectedValueOnce(new Error('download'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mount(PackEditorView);
    await wrapper
      .findAllComponents(QInput)[0]
      .vm.$emit('update:modelValue', 'Demo');
    const category = wrapper
      .findAllComponents(QSelect)
      .find((select) => select.attributes('label') === 'Category');
    category!.vm.$emit('update:modelValue', 'horror');
    await nextTick();

    await button(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(mocks.saveSoundPack.mock.calls[0][0].category).toBe('horror');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    wrapper.unmount();
  });
});
