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

const MarkdownEditorStub = defineComponent({
  name: 'MarkdownEditor',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(_, { expose }) {
    expose({ getMarkdown: () => '# Latest markdown' });
    return () => h('div', { class: 'markdown-editor-stub' });
  },
});

const EmptyMarkdownEditorStub = defineComponent({
  name: 'MarkdownEditor',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(_, { expose }) {
    expose({ getMarkdown: () => '' });
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

    linkBlock(wrapper, 'character').vm.$emit('update:modelValue', [
      { kind: 'character', id: 'c1' },
    ]);
    await wrapper.find('.entity-inline-editor input').setValue('Company');
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Company',
      characters: ['c1'],
    });
    wrapper.unmount();
  });

  it('supports cancel and delete for an existing party', async () => {
    const party = {
      id: 'p1',
      name: 'Company',
      description: '',
      notes: '',
      characters: [],
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
      id: 'p1',
      name: 'Company',
    });

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.findComponent(BaseModal).vm.$emit('delete');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['p1']);
    wrapper.unmount();
  });

  it('validates the encounter name', async () => {
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
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Ambush',
    });
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });

  it('shows notes linking when creating an encounter', () => {
    const wrapper = mount(EncounterEditor, {
      props: { encounter: null, isOpen: true },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    expect(linkBlock(wrapper, 'note')).toBeTruthy();
    wrapper.unmount();
  });

  it('opens encounters through the exposed editor API and deletes', async () => {
    const encounter = {
      id: 'e1',
      name: 'Ambush',
      description: 'Goblins',
      pawns: {},
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

  it('handles note cancel and delete', async () => {
    const note = {
      id: 'n1',
      title: 'Note',
      content: '',
      typeId: null,
      tags: [],
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
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      id: 'n1',
      title: 'Note',
    });

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.findComponent(BaseModal).vm.$emit('delete');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['n1']);
    wrapper.unmount();
  });

  it('resets the draft when the note is cleared', async () => {
    const note = {
      id: 'n1',
      title: 'Note',
      content: '',
      typeId: null,
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    };
    const wrapper = mount(NoteEditor, {
      props: { note, isOpen: true },
      global: {
        stubs: {
          MarkdownEditor: EmptyMarkdownEditorStub,
          EntitiesLinking: EntitiesLinkingStub,
          NoteTypeSelector: true,
          TagSelector: true,
        },
      },
    });

    await wrapper.setProps({ note: null });
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(alertMock).toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toBeUndefined();
    wrapper.unmount();
  });
});
