import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import CharacterCard from '@/characters/CharacterCard.vue';
import PartyCard from '@/parties/PartyCard.vue';
import NoteCard from '@/notes/NoteCard.vue';
import { IconBrush, IconFileText } from '@tabler/icons-vue';
import NumberSpinner from '@/components/common/NumberSpinner.vue';
import BaseCard from '@/components/common/BaseCard.vue';
import Button from '@/components/form/Button.vue';
import { quasarStubs } from '../helpers/quasar-stubs';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

const QInput = quasarStubs.QInput;

describe('domain cards', () => {
  beforeEach(() => {
    resetMockStores();
  });

  it('CharacterCard emits all BaseCard actions with the character', async () => {
    const character = { id: 'c1', name: 'Aria', notes: '' } as any;
    const wrapper = mount(CharacterCard, { props: { character } });

    const buttons = wrapper.findComponent(BaseCard).findAll('button');
    for (const button of buttons) await button.trigger('click');

    expect(wrapper.emitted('view')?.[0]).toEqual([character]);
    expect(wrapper.emitted('edit')?.[0]).toEqual([character]);
    expect(wrapper.emitted('delete')?.[0]).toEqual([character]);
    expect(wrapper.emitted('copy')?.[0]).toEqual([character]);
  });

  it('PartyCard shows description, characters and modules and emits actions', async () => {
    seedMockStore('modules', [{ id: 'm1', name: 'Campaign' }]);
    const party = {
      id: 'p1',
      name: 'Heroes',
      description: 'A brave group',
      characters: ['c1', 'c2'],
      moduleIds: ['m1', 'missing'],
    } as any;
    const wrapper = mount(PartyCard, { props: { party } });
    await nextTick();

    expect(wrapper.text()).toContain('A brave group');
    expect(wrapper.text()).toContain('2 characters');
    expect(wrapper.text()).toContain('Campaign');

    const buttons = wrapper.findComponent(BaseCard).findAll('button');
    for (const button of buttons) await button.trigger('click');
    expect(wrapper.emitted('view')?.[0]).toEqual([party]);
    expect(wrapper.emitted('edit')?.[0]).toEqual([party]);
    expect(wrapper.emitted('delete')?.[0]).toEqual([party]);
    expect(wrapper.emitted('copy')?.[0]).toEqual([party]);
  });

  it('NoteCard emits actions and tag clicks', async () => {
    const note = {
      id: 'n1',
      title: 'Session',
      content: 'Hello **world**',
      tags: ['session', 'combat'],
      typeId: null,
      moduleId: null,
      hidden: false,
      createdAt: 0,
      updatedAt: 0,
    } as any;
    const wrapper = mount(NoteCard, { props: { note } });

    const buttons = wrapper.findComponent(BaseCard).findAll('button');
    for (const button of buttons) await button.trigger('click');
    expect(wrapper.emitted('view')?.[0]).toEqual([note]);
    expect(wrapper.emitted('edit')?.[0]).toEqual([note]);
    expect(wrapper.emitted('delete')?.[0]).toEqual([note]);
    expect(wrapper.emitted('copy')?.[0]).toEqual([note]);

    await wrapper.findAll('.tag')[1].trigger('click');
    expect(wrapper.emitted('tag-click')?.[0]).toEqual(['combat']);
  });

  it('shows the note content-type icon', () => {
    const note = {
      id: 'n1',
      title: 'Sketch',
      content: '',
      contentType: 'draw',
      preview: 'data:image/png;base64,preview',
      tags: [],
      typeId: null,
      moduleId: null,
      hidden: false,
      createdAt: 0,
      updatedAt: 0,
    } as any;

    const drawing = mount(NoteCard, { props: { note } });
    expect(drawing.findComponent(IconBrush).exists()).toBe(true);
    expect(drawing.findComponent(IconBrush).classes()).toContain('text-grey-7');
    expect(drawing.find('img').attributes('src')).toBe(
      'data:image/png;base64,preview',
    );

    const text = mount(NoteCard, {
      props: { note: { ...note, contentType: 'text' } },
    });
    expect(text.findComponent(IconFileText).exists()).toBe(true);
    expect(text.findComponent(IconFileText).classes()).toContain('text-grey-7');
    expect(text.findComponent(IconBrush).exists()).toBe(false);
  });

  it('NoteCard expands clamped content', async () => {
    const note = {
      id: 'n1',
      title: 'Long note',
      content: 'Body',
      tags: [],
      typeId: null,
      moduleId: null,
      hidden: false,
      createdAt: 0,
      updatedAt: 0,
    } as any;
    const wrapper = mount(NoteCard, { props: { note } });

    const content = wrapper.find('.note-card-content').element;
    Object.defineProperty(content, 'scrollHeight', {
      configurable: true,
      value: 700,
    });
    await wrapper.setProps({ note: { ...note, content: 'Updated body' } });
    await nextTick();
    await nextTick();

    const expand = wrapper.findComponent(Button);
    expect(expand.exists()).toBe(true);
    await expand.trigger('click');
    await nextTick();
    expect(wrapper.find('.note-card-content').classes()).not.toContain(
      'clamped',
    );
  });

  it('NumberSpinner clamps input, adjusts buttons and repeats while held', async () => {
    vi.useFakeTimers();
    const wrapper = mount(NumberSpinner, {
      props: { modelValue: 5, min: 0, max: 9 },
    });

    const input = wrapper.findComponent(QInput);
    input.vm.$emit('update:modelValue', 'not-a-number');
    input.vm.$emit('update:modelValue', '12');
    input.vm.$emit('update:modelValue', '-2');
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([[9], [0]]);

    const buttons = wrapper.findAll('button');
    await buttons[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([6]);
    await buttons[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([4]);

    await buttons[0].trigger('mousedown');
    vi.advanceTimersByTime(400);
    vi.advanceTimersByTime(160);
    expect(wrapper.emitted('update:modelValue')?.length).toBeGreaterThan(4);
    await buttons[0].trigger('mouseup');

    await buttons[0].trigger('mouseenter');
    await buttons[0].trigger('mouseleave');
    expect(wrapper.find('svg').exists()).toBe(true);

    wrapper.unmount();
    vi.useRealTimers();
  });
});
