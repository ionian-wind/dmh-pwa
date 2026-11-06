import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

import BaseModal from '@/components/common/BaseModal.vue';
import NumberSpinner from '@/components/common/NumberSpinner.vue';
import EncounterEditor from '@/encounters/EncounterEditor.vue';
import PartyEditor from '@/parties/PartyEditor.vue';
import TimerEditor from '@/timers/TimerEditor.vue';
import NoteEditor from '@/notes/NoteEditor.vue';
import { alert } from '@/dialogs';

vi.mock('@/dialogs', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/notes/NoteCanvas.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      name: 'NoteCanvas',
      props: { modelValue: String },
      setup(_, { expose }) {
        expose({
          getSnapshot: () => '{"document":"snapshot"}',
          getPreview: () => Promise.resolve('data:image/png;base64,preview'),
        });
        return () => h('div', { class: 'note-canvas-stub' });
      },
    }),
  };
});

const MarkdownEditorStub = defineComponent({
  name: 'MarkdownEditor',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(_, { expose }) {
    expose({ getMarkdown: () => '# Latest markdown' });
    return () => h('div', { class: 'markdown-editor-stub' });
  },
});

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: { kind: String, modelValue: Array },
  emits: ['update:modelValue'],
  setup(props) {
    return () =>
      h('div', {
        class: 'entities-linking-stub',
        'data-kind': props.kind,
      });
  },
});

const alertMock = vi.mocked(alert);

function linkBlock(wrapper: ReturnType<typeof mount>, kind: string) {
  return wrapper
    .findAllComponents(EntitiesLinkingStub)
    .find((entry) => entry.props('kind') === kind)!;
}

describe('editor behavior', () => {
  beforeEach(() => {
    alertMock.mockReset();
    alertMock.mockResolvedValue(undefined);
  });

  it('converts timer duration from the three spinners', async () => {
    const wrapper = mount(TimerEditor, {
      props: { timer: null, isOpen: true },
    });

    const spinners = wrapper.findAllComponents(NumberSpinner);
    expect(spinners).toHaveLength(3);
    spinners[0].vm.$emit('update:modelValue', 1);
    spinners[1].vm.$emit('update:modelValue', 2);
    spinners[2].vm.$emit('update:modelValue', 3);
    await nextTick();

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      duration: 3_723_000,
    });
    wrapper.unmount();
  });

  it('loads timer fields from an existing timer and resets on cancel/delete', async () => {
    const timer = {
      id: 't1',
      title: 'Torch',
      description: 'Burns',
      duration: 3_723_000,
      startedAt: null,
      status: 'inactive',
      createdAt: 1,
      updatedAt: 1,
    };
    const wrapper = mount(TimerEditor, {
      props: { timer, isOpen: true },
    });
    const spinners = wrapper.findAllComponents(NumberSpinner);
    expect(spinners[0].props('modelValue')).toBe(1);
    expect(spinners[1].props('modelValue')).toBe(2);
    expect(spinners[2].props('modelValue')).toBe(3);

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);

    wrapper.findComponent(BaseModal).vm.$emit('delete');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['t1']);

    await wrapper.setProps({ timer: null });
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    expect(wrapper.emitted('submit')?.at(-1)?.[0]).toMatchObject({
      duration: 60_000,
    });
    wrapper.unmount();
  });

  it('validates and normalizes party submissions', async () => {
    const wrapper = mount(PartyEditor, {
      props: { party: null, isOpen: true },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(alertMock).toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toBeUndefined();

    linkBlock(wrapper, 'module').vm.$emit('update:modelValue', [
      { kind: 'module', id: 'm1' },
      { kind: 'module', id: 'm2' },
    ]);
    linkBlock(wrapper, 'character').vm.$emit('update:modelValue', [
      { kind: 'character', id: 'c1' },
    ]);
    await wrapper.find('.entity-inline-editor input').setValue('Company');
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Company',
      moduleIds: ['m1', 'm2'],
      characters: ['c1'],
    });
    wrapper.unmount();
  });

  it('normalizes legacy party module objects and supports cancel/delete', async () => {
    const party = {
      id: 'p1',
      name: 'Company',
      description: '',
      notes: '',
      characters: [],
      moduleIds: [{ id: 'legacy' }, '', null],
      createdAt: 1,
      updatedAt: 1,
    } as any;
    const wrapper = mount(PartyEditor, {
      props: { party, isOpen: true },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      moduleIds: ['legacy'],
      id: 'p1',
    });

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.findComponent(BaseModal).vm.$emit('delete');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['p1']);
    wrapper.unmount();
  });

  it('validates encounter name and module and links a module', async () => {
    const wrapper = mount(EncounterEditor, {
      props: { encounter: null, isOpen: true },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(alertMock).toHaveBeenCalledTimes(1);

    await wrapper.find('#encounter-name').setValue('Ambush');
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(alertMock).toHaveBeenCalledTimes(2);

    linkBlock(wrapper, 'module').vm.$emit('update:modelValue', [
      { kind: 'module', id: 'm1' },
      { kind: 'module', id: 'm2' },
    ]);
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Ambush',
      moduleIds: ['m1', 'm2'],
    });
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });

  it('opens encounters through the exposed editor API and deletes', async () => {
    const encounter = {
      id: 'e1',
      name: 'Ambush',
      description: 'Goblins',
      monsters: {},
      moduleIds: ['m1'],
      notes: '',
      createdAt: 1,
      updatedAt: 1,
    };
    const wrapper = mount(EncounterEditor, {
      props: { encounter: null, isOpen: true },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    (wrapper.vm as any).openEditor(encounter);
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Ambush',
      moduleIds: ['m1'],
    });

    (wrapper.vm as any).openEditor();
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(2);

    await wrapper.setProps({ encounter });
    wrapper.findComponent(BaseModal).vm.$emit('delete');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['e1']);
    wrapper.unmount();
  });

  it('handles note cancel, delete and module linking', async () => {
    const note = {
      id: 'n1',
      title: 'Note',
      content: '',
      contentType: 'text',
      typeId: null,
      tags: [],
      moduleIds: [],
      hidden: false,
      createdAt: 1,
      updatedAt: 1,
    };
    const wrapper = mount(NoteEditor, {
      props: { note, isOpen: true },
      global: {
        stubs: {
          MarkdownEditor: MarkdownEditorStub,
          EntitiesLinking: EntitiesLinkingStub,
          NoteTypeSelector: true,
          TagSelector: true,
        },
      },
    });

    expect(wrapper.findComponent(BaseModal).props('tabs')).toHaveLength(2);
    linkBlock(wrapper, 'module').vm.$emit('update:modelValue', [
      { kind: 'module', id: 'm2' },
      { kind: 'module', id: 'm3' },
    ]);
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      moduleIds: ['m2', 'm3'],
    });

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.findComponent(BaseModal).vm.$emit('delete');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['n1']);
    wrapper.unmount();
  });

  it('hides note tabs and resets the draft when the note is cleared', async () => {
    const note = {
      id: 'n1',
      title: 'Note',
      content: '',
      contentType: 'text',
      typeId: null,
      tags: [],
      moduleIds: ['m1'],
      hidden: false,
      createdAt: 1,
      updatedAt: 1,
    };
    const wrapper = mount(NoteEditor, {
      props: { note, isOpen: true, hideModuleSelector: true },
      global: {
        stubs: {
          MarkdownEditor: MarkdownEditorStub,
          EntitiesLinking: EntitiesLinkingStub,
          NoteTypeSelector: true,
          TagSelector: true,
        },
      },
    });

    expect(wrapper.findComponent(BaseModal).props('tabs')).toEqual([]);

    await wrapper.setProps({ note: null });
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(alertMock).toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toBeUndefined();
    wrapper.unmount();
  });

  it('uses the canvas snapshot for drawing notes with an empty preview', async () => {
    const wrapper = mount(NoteEditor, {
      props: {
        note: {
          id: 'n2',
          title: 'Sketch',
          content: '',
          contentType: 'draw',
          typeId: null,
          tags: [],
          moduleIds: [],
          hidden: false,
          createdAt: 1,
          updatedAt: 1,
        },
        isOpen: true,
      },
      global: {
        stubs: {
          MarkdownEditor: MarkdownEditorStub,
          EntitiesLinking: EntitiesLinkingStub,
          NoteTypeSelector: true,
          TagSelector: true,
        },
      },
    });

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      content: '{"document":"snapshot"}',
      preview: 'data:image/png;base64,preview',
    });
    wrapper.unmount();
  });
});
