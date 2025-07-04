<script setup lang="ts">
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-vue';
import { useI18n } from 'vue-i18n';
import { PropType } from 'vue';

const { t } = useI18n();

const props = defineProps({
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
    default: 'Create',
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
    default: 'Create',
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
});

const emit = defineEmits(['create', 'update:searchQuery']);
</script>

<template>
  <QToolbarTitle v-if="props.title">
    {{ props.title }}
  </QToolbarTitle>

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
</template>
