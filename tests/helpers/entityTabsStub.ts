import { defineComponent, h } from 'vue';

export const EntityTabsStub = defineComponent({
  name: 'EntityTabs',
  props: {
    modelValue: { type: String, default: '' },
    tabs: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue', 'tab-click'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { class: 'entity-tabs-stub' },
        (props.tabs as Array<{ id: string; label: string }>).map((tab) =>
          h(
            'button',
            {
              type: 'button',
              'data-tab': tab.id,
              onClick: () => {
                emit('tab-click', tab);
                emit('update:modelValue', tab.id);
              },
            },
            tab.label,
          ),
        ),
      );
  },
});
