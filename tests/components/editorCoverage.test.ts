import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import CharacterEditor from '@/characters/CharacterEditor.vue';
import ModuleEditor from '@/modules/ModuleEditor.vue';
import PlaylistEditor from '@/jukebox/components/PlaylistEditor.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const mocks = vi.hoisted(() => ({
  alert: vi.fn().mockResolvedValue(undefined),
  playlists: {
    items: { value: [] as any[] },
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/dialogs', () => ({ alert: mocks.alert }));
vi.mock('@/jukebox/stores', () => ({
  useJukeboxPlaylistsStore: () => mocks.playlists,
}));

const EntitiesLinkingStub = {
  name: 'EntitiesLinking',
  props: ['kind', 'modelValue'],
  template: '<div class="entities-linking-stub" />',
};

const EntityMarkdownEditorStub = {
  name: 'EntityMarkdownEditor',
  props: ['modelValue', 'isVisualMode', 'entityId', 'entityType'],
  template: '<div class="entity-markdown-editor-stub" />',
};

describe('editor coverage gaps', () => {
  it('CharacterEditor resets on close, validates names and cancels', async () => {
    const character = {
      id: 'c1',
      name: 'Alice',
      notes: 'Notes',
      moduleIds: [],
      createdAt: 1,
      updatedAt: 1,
    };
    const wrapper = mount(CharacterEditor, {
      props: { isOpen: true, character: character as any },
      global: {
        stubs: {
          EntitiesLinking: EntitiesLinkingStub,
          EntityMarkdownEditor: EntityMarkdownEditorStub,
        },
      },
    });
    await wrapper.setProps({ isOpen: false });
    expect(wrapper.findComponent(BaseModal).props('isOpen')).toBe(false);
    await wrapper.setProps({ isOpen: true, character: null as any });
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();
    expect(mocks.alert).toHaveBeenCalled();
    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });

  it('ModuleEditor validates names, submits existing modules and deletes', async () => {
    const wrapper = mount(ModuleEditor, {
      props: { isOpen: true, module: null },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();
    expect(mocks.alert).toHaveBeenCalled();
    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);

    const moduleItem = {
      id: 'mod1',
      name: 'Campaign',
      description: 'Desc',
      createdAt: 1,
      updatedAt: 1,
    };
    const existing = mount(ModuleEditor, {
      props: { isOpen: true, module: moduleItem as any },
    });
    const inputs = existing.findAllComponents(quasarStubs.QInput);
    inputs[0].vm.$emit('update:modelValue', 'Updated');
    await nextTick();
    existing.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();
    expect(existing.emitted('submit')?.[0]?.[0]).toMatchObject({
      id: 'mod1',
      name: 'Updated',
    });
    existing.findComponent(BaseModal).vm.$emit('delete');
    expect(existing.emitted('delete')?.[0]).toEqual(['mod1']);
    wrapper.unmount();
    existing.unmount();
  });

  it('PlaylistEditor resets on open, cancels and updates modal state', async () => {
    const wrapper = mount(PlaylistEditor, {
      props: { modelValue: false, playlist: null },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    await wrapper.setProps({ modelValue: true });
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    wrapper.findComponent(BaseModal).vm.$emit('update:isOpen', false);
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([false]);
    wrapper.unmount();
  });
});
