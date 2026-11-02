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

const QVirtualScroll = defineComponent({
  name: 'QVirtualScroll',
  props: { items: { type: Array, default: () => [] } },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'div',
        { ...attrs, 'data-stub': 'QVirtualScroll' },
        (props.items as any[]).flatMap(
          (item) => slots.default?.({ item }) ?? [],
        ),
      );
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
      h(
        'div',
        { 'data-stub': 'QPopupEdit' },
        slots.default?.({ value: 0, set: () => {} }),
      );
  },
});

const QPopupProxy = defineComponent({
  name: 'QPopupProxy',
  setup(_, { slots }) {
    return () => h('div', { 'data-stub': 'QPopupProxy' }, slots.default?.());
  },
});

const QColor = defineComponent({
  name: 'QColor',
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        class: 'q-color-stub',
        value: props.modelValue,
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
      });
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
  'QRadio',
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
  'QScrollArea',
  'QHeader',
  'QFooter',
  'QToolbar',
];

const QCheckbox = defineComponent({
  name: 'QCheckbox',
  inheritAttrs: false,
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        ...attrs,
        type: 'checkbox',
        checked: props.modelValue,
        onChange: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).checked),
      });
  },
});

export const quasarStubs: Record<string, any> = {
  QBtn,
  QInput,
  QSelect,
  QToggle,
  QDialog,
  QMenu,
  QColor,
  QPopupEdit,
  QPopupProxy,
  QVirtualScroll,
};

for (const name of passthroughNames) {
  quasarStubs[name] = slotStub(name);
}

quasarStubs.QCheckbox = QCheckbox;
