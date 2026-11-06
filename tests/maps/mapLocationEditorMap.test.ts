import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  getMapFile: vi.fn(),
  getMapFileBlob: vi.fn(),
  putMapFile: vi.fn(),
  deleteMapFile: vi.fn(),
  createMapFileFromFile: vi.fn(),
  createMapFileFromHandle: vi.fn(),
  alert: vi.fn(),
}));

vi.mock('@/maps/maps', () => ({
  getMapFile: mocks.getMapFile,
  putMapFile: mocks.putMapFile,
  deleteMapFile: mocks.deleteMapFile,
}));

vi.mock('@/maps/utils/mapFileUtils', () => ({
  createMapFileFromFile: mocks.createMapFileFromFile,
  createMapFileFromHandle: mocks.createMapFileFromHandle,
  getMapFileBlob: mocks.getMapFileBlob,
}));

import MapLocationEditor from '@/maps/components/MapLocationEditor.vue';

const existingFile = {
  id: 'file-old',
  name: 'old.png',
  size: 5,
  type: 'image/png',
  lastModified: 1,
  source: { kind: 'blob', blob: new Blob(['old']) },
  createdAt: 1,
  updatedAt: 1,
};

const newFile = {
  id: 'file-new',
  name: 'new.png',
  size: 6,
  type: 'image/png',
  lastModified: 2,
  source: { kind: 'blob', blob: new Blob(['new']) },
  createdAt: 2,
  updatedAt: 2,
};

const location = {
  id: 'l1',
  name: 'Town',
  description: '',
  entities: [],
  map: {
    fileId: 'file-old',
    layers: [{ id: 'base', title: 'Base' }],
    markers: [],
    areas: [],
  },
  createdAt: 1,
  updatedAt: 1,
};

function mountEditor(props: Record<string, unknown> = {}) {
  return mount(MapLocationEditor, {
    props: { isOpen: true, location, ...props },
    global: {
      stubs: {
        EntitiesLinking: true,
        EntityScenesPanel: true,
        EntityMarkdownEditor: {
          name: 'EntityMarkdownEditor',
          props: ['modelValue', 'isVisualMode', 'entityId', 'entityType'],
          template: '<div class="entity-markdown-editor-stub" />',
        },
      },
    },
  });
}

function chooseFile(wrapper: any, name: string, type: string) {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    value: [new File(['image'], name, { type })],
    configurable: true,
  });
  return input.trigger('change');
}

describe('MapLocationEditor map image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMapFile.mockResolvedValue(existingFile);
    mocks.getMapFileBlob.mockResolvedValue(new Blob(['old']));
    mocks.createMapFileFromFile.mockResolvedValue(newFile);
    mocks.createMapFileFromHandle.mockResolvedValue(newFile);
    delete (window as any).showOpenFilePicker;
    mocks.putMapFile.mockResolvedValue(undefined);
    mocks.deleteMapFile.mockResolvedValue(undefined);
    vi.spyOn(window, 'alert').mockImplementation(mocks.alert);
    (URL as any).createObjectURL = vi.fn(() => 'blob:preview');
    (URL as any).revokeObjectURL = vi.fn();
  });

  it('loads the existing map preview and file name', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(mocks.getMapFile).toHaveBeenCalledWith('file-old');
    expect(wrapper.find('.selected-file').text()).toBe('old.png');
    expect(wrapper.find('.map-image-preview').exists()).toBe(true);
  });

  it('rejects non-image files', async () => {
    const wrapper = mountEditor({ location: null });
    await chooseFile(wrapper, 'notes.txt', 'text/plain');

    expect(mocks.createMapFileFromFile).not.toHaveBeenCalled();
    expect(mocks.alert).toHaveBeenCalled();
  });

  it('prefers the File System Access picker when available', async () => {
    const pickedFile = new File(['image'], 'handled.png', {
      type: 'image/png',
    });
    const handle = {
      kind: 'file',
      name: 'handled.png',
      getFile: vi.fn().mockResolvedValue(pickedFile),
    } as unknown as FileSystemFileHandle;
    (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([handle]);
    const wrapper = mountEditor({ location: null });

    const select = wrapper.find('.map-image-field button');
    await select.trigger('click');
    await flushPromises();

    expect((window as any).showOpenFilePicker).toHaveBeenCalled();
    expect(mocks.createMapFileFromHandle).toHaveBeenCalledWith(
      handle,
      'handled.png',
    );
    expect(mocks.createMapFileFromFile).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('stores a replacement image and deletes the old file on save', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    await chooseFile(wrapper, 'new.png', 'image/png');
    await flushPromises();
    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await flushPromises();

    expect(mocks.putMapFile).toHaveBeenCalledWith(newFile);
    expect(mocks.deleteMapFile).toHaveBeenCalledWith('file-old');
    expect(wrapper.emitted('save')?.[0][0]).toMatchObject({
      id: 'l1',
      map: expect.objectContaining({ fileId: 'file-new' }),
    });
  });

  it('does not delete a file when creating a location', async () => {
    const wrapper = mountEditor({ location: null });
    await flushPromises();

    await wrapper.find('.entity-inline-editor input').setValue('New place');
    await chooseFile(wrapper, 'new.png', 'image/png');
    await flushPromises();
    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await flushPromises();

    expect(mocks.putMapFile).toHaveBeenCalledWith(newFile);
    expect(mocks.deleteMapFile).not.toHaveBeenCalled();
  });

  it('reports image processing failures', async () => {
    mocks.createMapFileFromFile.mockRejectedValueOnce(new Error('bad image'));
    const wrapper = mountEditor({ location: null });

    await chooseFile(wrapper, 'bad.png', 'image/png');
    await flushPromises();

    expect(mocks.alert).toHaveBeenCalled();
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('ignores file selection without a file', async () => {
    const wrapper = mountEditor({ location: null });
    const input = wrapper.find('input[type="file"]');
    Object.defineProperty(input.element, 'files', {
      value: [],
      configurable: true,
    });
    await input.trigger('change');

    expect(mocks.createMapFileFromFile).not.toHaveBeenCalled();
  });

  it('clears the existing map and deletes its file on save', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    const clear = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Clear map'));
    expect(clear).toBeTruthy();
    await clear!.trigger('click');
    await flushPromises();

    expect(wrapper.find('.map-image-preview').exists()).toBe(false);
    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    await flushPromises();

    expect(mocks.putMapFile).not.toHaveBeenCalled();
    expect(mocks.deleteMapFile).toHaveBeenCalledWith('file-old');
    expect(wrapper.emitted('save')?.[0][0]).toMatchObject({
      id: 'l1',
      map: expect.objectContaining({
        fileId: '',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [],
        areas: [],
      }),
    });
  });

  it('does not show the clear map action for a location without a map', async () => {
    const wrapper = mountEditor({ location: null });
    await flushPromises();

    expect(
      wrapper
        .findAll('button')
        .some((button) => button.text().includes('Clear map')),
    ).toBe(false);
  });
});
