<script setup lang="ts">
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-vue';
import { useI18n } from 'vue-i18n';
import { inject, type Ref, type PropType } from 'vue';
import { ComponentInjection } from '@/types';
import IconRightDrawer from '@/components/common/IconRightDrawer.vue';

const { t } = useI18n();

const props = defineProps({
  buttons: {
    type: Array as PropType<
      {
        icon: any;
        color: string;
        title: string;
        disabled?: boolean;
        event: (
          evt: Event,
          go?: (opts?: {
            to?: any;
            replace?: boolean;
            returnRouterError?: boolean;
          }) => Promise<any>,
        ) => void;
      }[]
    >,
    default: [],
  },
  title: {
    type: String,
    default: '',
  },
  showCreate: {
    type: Boolean,
    default: false,
  },
  createTitle: {
    type: String,
    default: 'Create',
  },
  onCreate: {
    type: Function as PropType<
      (
        evt: Event,
        go?: (opts?: {
          to?: any;
          replace?: boolean;
          returnRouterError?: boolean;
        }) => Promise<any>,
      ) => void
    >,
    default: (evt: Event) => {},
  },

  showEdit: {
    type: Boolean,
    default: false,
  },
  editTitle: {
    type: String,
    default: 'Edit',
  },
  onEdit: {
    type: Function as PropType<
      (
        evt: Event,
        go?: (opts?: {
          to?: any;
          replace?: boolean;
          returnRouterError?: boolean;
        }) => Promise<any>,
      ) => void
    >,
    default: (evt: Event) => {},
  },

  showDelete: {
    type: Boolean,
    default: false,
  },
  deleteTitle: {
    type: String,
    default: 'Delete',
  },
  onDelete: {
    type: Function as PropType<
      (
        evt: Event,
        go?: (opts?: {
          to?: any;
          replace?: boolean;
          returnRouterError?: boolean;
        }) => Promise<any>,
      ) => void
    >,
    default: (evt: Event) => {},
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  showSearch: {
    type: Boolean,
    default: false,
  },
  searchQuery: {
    type: String,
    default: '',
  },
  searchPlaceholder: {
    type: String,
    default: '',
  },
  rightDrawerIcon: {
    type: [Object, Function],
    default: () => IconRightDrawer,
  },
});

const emit = defineEmits(['create', 'update:searchQuery']);

const rightDrawerContent = inject<Ref<ComponentInjection | null>>(
  'rightDrawerContent',
  null,
);
const toggleRightDrawer = inject<() => void>('toggleRightDrawer', () => {});
</script>

<template>
  <QToolbarTitle v-if="props.title">
    {{ props.title }}
  </QToolbarTitle>
  <QSpace v-else />

  <QInput
    v-if="props.showSearch"
    :autofocus="false"
    :model-value="props.searchQuery"
    @update:model-value="(val) => emit('update:searchQuery', val)"
    :placeholder="t(props.searchPlaceholder)"
    class="search-input"
    clearable
    dense
    outlined
  />

  <QBtnGroup v-if="props.buttons.length > 0">
    <QBtn
      v-for="(btn, index) in props.buttons"
      :color="btn.color"
      @click="btn.event"
      :title="t(btn.title)"
      :aria-label="t(btn.title)"
      :disable="btn.disabled"
    >
      <component :is="btn.icon"></component>
    </QBtn>
  </QBtnGroup>

  <QBtnGroup>
    <QBtn
      v-if="props.showCreate"
      :color="'positive'"
      @click="props.onCreate"
      :title="t('common.create')"
      :aria-label="t('common.create')"
    >
      <IconPlus />
    </QBtn>

    <QBtn
      v-if="props.showEdit"
      :color="'positive'"
      @click="props.onEdit"
      :disabled="props.isEditing"
      :title="t('common.edit')"
      :aria-label="t('common.edit')"
    >
      <IconPencil />
    </QBtn>

    <QBtn
      v-if="props.showDelete"
      :color="'negative'"
      @click="props.onDelete"
      :title="t('common.delete')"
      :aria-label="t('common.delete')"
    >
      <IconTrash />
    </QBtn>
  </QBtnGroup>
  <QBtnGroup>
    <QBtn v-if="rightDrawerContent" @click="toggleRightDrawer">
      <component :is="props.rightDrawerIcon" />
    </QBtn>
  </QBtnGroup>
</template>
