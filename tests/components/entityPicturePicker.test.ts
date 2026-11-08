import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  pickFiles: vi.fn(),
  importFile: vi.fn(),
}));

vi.mock('@/composables/useStoredFileUrl', () => ({
  useStoredFileUrl: () => ref('blob:picture'),
}));

vi.mock('@/utils/files', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  pickFiles: mocks.pickFiles,
  importFile: mocks.importFile,
}));

import EntityPicturePicker from '@/components/common/EntityPicturePicker.vue';

describe('EntityPicturePicker', () => {
  it('imports a selected image and emits its stored file id', async () => {
    const file = new File(['image'], 'portrait.png', { type: 'image/png' });
    mocks.pickFiles.mockResolvedValue([
      { file, source: { kind: 'blob', blob: file } },
    ]);
    mocks.importFile.mockResolvedValue({
      file: { id: 'file-1', name: 'portrait.png' },
      created: true,
    });

    const wrapper = mount(EntityPicturePicker, {
      props: { modelValue: '' },
    });

    await wrapper.find('.entity-picture-select').trigger('click');
    await flushPromises();

    expect(mocks.importFile).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ contentHash: true }),
    );
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['file-1']);
    wrapper.unmount();
  });

  it('removes the current picture', async () => {
    const wrapper = mount(EntityPicturePicker, {
      props: { modelValue: 'file-1' },
    });

    expect(wrapper.find('img').attributes('src')).toBe('blob:picture');
    await wrapper.find('.entity-picture-remove').trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
    wrapper.unmount();
  });
});
