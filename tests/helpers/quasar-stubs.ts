import { defineComponent, h } from 'vue';

const slotStub = (name: string) =>
  defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      return () => h('div', { ...attrs, 'data-stub': name }, slots.default?.());
    },
  });

const QBtn = defineComponent({
  name: 'QBtn',
  inheritAttrs: false,
  props: { label: { type: String, default: '' }, disable: Boolean },
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          disabled: props.disable,
          onClick: (event: MouseEvent) => emit('click', event),
        },
        slots.default?.() ?? props.label,
      );
  },
});

const QInput = defineComponent({
  name: 'QInput',
  inheritAttrs: false,
  props: { modelValue: { type: [String, Number], default: '' } },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        ...attrs,
        value: props.modelValue,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
      });
  },
});

const QSelect = defineComponent({
  name: 'QSelect',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number, Array, Object, null], default: null },
    options: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () =>
      h(
        'select',
        {
          ...attrs,
          value: props.modelValue as any,
          onChange: (event: Event) =>
            emit(
              'update:modelValue',
              (event.target as HTMLSelectElement).value,
            ),
        },
        (props.options as any[]).map((option: any) =>
          h(
            'option',
            { value: typeof option === 'object' ? option.value : option },
            typeof option === 'object' ? option.label : String(option),
          ),
        ),
      );
  },
});

const QToggle = defineComponent({
  name: 'QToggle',
  inheritAttrs: false,
  props: { modelValue: Boolean, disable: Boolean, label: String },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h('label', { ...attrs }, [
        h('input', {
          type: 'checkbox',
          checked: props.modelValue,
          disabled: props.disable,
          onChange: (event: Event) =>
            emit(
              'update:modelValue',
              (event.target as HTMLInputElement).checked,
            ),
        }),
        props.label,
        slots.default?.(),
      ]);
  },
});

const QDialog = defineComponent({
  name: 'QDialog',
  props: { modelValue: Boolean },
  setup(_, { slots }) {
    return () => h('div', { 'data-stub': 'QDialog' }, slots.default?.());
  },
});

const QMenu = defineComponent({
  name: 'QMenu',
  props: { modelValue: Boolean },
  setup(_, { slots }) {
    return () => h('div', { 'data-stub': 'QMenu' }, slots.default?.());
  },
});

const QPopupEdit = defineComponent({
  name: 'QPopupEdit',
  props: { modelValue: null },
  emits: ['save', 'hide'],
  setup(_, { slots }) {
    return () =>
      h('div', { 'data-stub': 'QPopupEdit' }, slots.default?.({ value: 0, set: () => {} }));
  },
});

const QPopupProxy = defineComponent({
  name: 'QPopupProxy',
  setup(_, { slots }) {
    return () => h('div', { 'data-stub': 'QPopupProxy' }, slots.default?.());
  },
});

const passthroughNames = [
  'QLayout',
  'QPage',
  'QPageContainer',
  'QDrawer',
  'QCard',
  'QCardSection',
  'QCardActions',
  'QToolbar',
  'QToolbarTitle',
  'QScrollArea',
  'QSpace',
  'QSeparator',
  'QBanner',
  'QAvatar',
  'QBtnGroup',
  'QTabs',
  'QTab',
  'QTabPanels',
  'QTabPanel',
  'QItem',
  'QItemSection',
  'QList',
  'QSlider',
  'QExpansionItem',
  'QCheckbox',
  'QField',
  'QForm',
  'QBadge',
  'QChip',
  'QIcon',
  'QSpinner',
  'QTable',
  'QTr',
  'QTh',
  'QTd',
  'QLinearProgress',
  'QCircularProgress',
  'QSkeleton',
  'QNoSsr',
  'QMarkupTable',
  'QVirtualScroll',
  'QScrollArea',
  'QHeader',
  'QFooter',
  'QToolbar',
];

export const quasarStubs: Record<string, any> = {
  QBtn,
  QInput,
  QSelect,
  QToggle,
  QDialog,
  QMenu,
  QPopupEdit,
  QPopupProxy,
};

for (const name of passthroughNames) {
  quasarStubs[name] = slotStub(name);
}
