import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import BaseModal from '@/components/common/BaseModal.vue';
import EncounterEditor from '@/encounters/EncounterEditor.vue';
import PartyEditor from '@/parties/PartyEditor.vue';
import TimerEditor from '@/timers/TimerEditor.vue';

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: { kind: String, modelValue: Array },
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { class: 'entities-linking-stub' });
  },
});

async function submit(wrapper: ReturnType<typeof mount>) {
  wrapper.findComponent(BaseModal).vm.$emit('submit');
  await nextTick();
}

describe('editor submit identity', () => {
  it('keeps the party id when editing', async () => {
    const wrapper = mount(PartyEditor, {
      props: {
        isOpen: true,
        party: {
          id: 'p1',
          name: 'The Company',
          description: '',
          notes: '',
          characters: [],
          moduleIds: [],
          createdAt: 1,
          updatedAt: 1,
        },
      },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    await submit(wrapper);
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ id: 'p1' });
  });

  it('keeps the encounter id when editing', async () => {
    const wrapper = mount(EncounterEditor, {
      props: {
        isOpen: true,
        encounter: {
          id: 'e1',
          name: 'Ambush',
          description: '',
          pawns: {},
          moduleIds: ['m1'],
          createdAt: 1,
          updatedAt: 1,
        },
      },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    await submit(wrapper);
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ id: 'e1' });
  });

  it('keeps the timer id when editing', async () => {
    const wrapper = mount(TimerEditor, {
      props: {
        isOpen: true,
        timer: {
          id: 't1',
          title: 'Torch',
          description: '',
          duration: 60000,
          startedAt: null,
          status: 'inactive',
          createdAt: 1,
          updatedAt: 1,
        },
      },
    });

    await submit(wrapper);
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ id: 't1' });
  });
});
