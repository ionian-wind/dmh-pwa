<script setup lang="ts">
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-vue';
import { useI18n } from 'vue-i18n';
import { computed, type PropType } from 'vue';
import IconRightDrawer from '@/components/common/IconRightDrawer.vue';
import { useLayout } from '@/composables/useLayout';

const { t } = useI18n();

const props = defineProps({
  tabs: {
    type: Array as PropType<
      {
        id: string;
        label: string;
        icon?: any;
        disabled?: boolean;
      }[]
    >,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
  buttons: {
    type: Array as PropType<
      {
        icon: any;
        color: string;
        title: string;
        disabled?: boolean;
        href?: string;
        target?: string;
        rel?: string;
        event?: (
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
  leftButtons: {
    type: Array as PropType<
      {
        icon: any;
        color: string;
        title: string;
        disabled?: boolean;
        href?: string;
        target?: string;
        rel?: string;
        event?: (
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
  subtitle: {
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
  createLoading: {
    type: Boolean,
    default: false,
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

const emit = defineEmits([
  'create',
  'update:searchQuery',
  'update:modelValue',
  'tab-click',
]);

const { rightDrawerContent, toggleRightDrawer } = useLayout();

const hasPrimaryActions = computed(
  () => props.buttons.length > 0 || props.showCreate || props.showEdit,
);
</script>

<template>
  <QBtnGroup v-if="props.showDelete" class="view-header-delete">
    <QBtn
      :color="'negative'"
      @click="props.onDelete"
      :title="t('common.delete')"
      :aria-label="t('common.delete')"
    >
      <IconTrash />
    </QBtn>
  </QBtnGroup>

  <QBtnGroup v-if="props.leftButtons.length" class="view-header-left-actions">
    <QBtn
      v-for="(btn, index) in props.leftButtons"
      :key="index"
      :color="btn.color"
      @click="btn.event"
      :title="t(btn.title)"
      :aria-label="t(btn.title)"
      :disable="btn.disabled"
    >
      <component :is="btn.icon"></component>
    </QBtn>
  </QBtnGroup>

  <QToolbarTitle v-if="props.title || props.subtitle">
    <div>{{ props.title }}</div>
    <div v-if="props.subtitle" class="view-header-subtitle">
      {{ props.subtitle }}
    </div>
  </QToolbarTitle>
  <QSpace v-else />

  <QTabs
    v-if="props.tabs.length"
    :model-value="props.modelValue"
    dense
    align="center"
    class="view-header-tabs"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <QTab
      v-for="tab in props.tabs"
      :key="tab.id"
      :name="tab.id"
      :disable="tab.disabled"
      :title="tab.label"
      :aria-label="tab.label"
      @click="emit('tab-click', tab)"
    >
      <component :is="tab.icon" v-if="tab.icon" />
    </QTab>
  </QTabs>

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

  <QBtnGroup v-if="hasPrimaryActions">
    <QBtn
      v-for="(btn, index) in props.buttons"
      :key="index"
      :color="btn.color"
      @click="btn.event"
      :href="btn.href"
      :target="btn.target"
      :rel="btn.rel"
      :title="t(btn.title)"
      :aria-label="t(btn.title)"
      :disable="btn.disabled"
    >
      <component :is="btn.icon"></component>
    </QBtn>

    <QBtn
      v-if="props.showCreate"
      :color="'positive'"
      @click="props.onCreate"
      :title="t('common.create')"
      :aria-label="t('common.create')"
      :disable="props.createLoading"
      :loading="props.createLoading"
    >
      <IconPlus />
    </QBtn>

    <QBtn
      v-if="props.showEdit"
      :color="'positive'"
      @click="props.onEdit"
      :disable="props.isEditing"
      :title="t('common.edit')"
      :aria-label="t('common.edit')"
    >
      <IconPencil />
    </QBtn>
  </QBtnGroup>

  <QSeparator
    v-if="hasPrimaryActions && rightDrawerContent"
    vertical
    class="view-header-separator"
  />

  <QBtnGroup v-if="rightDrawerContent">
    <QBtn
      @click="toggleRightDrawer"
      :title="t('common.toggleSidebar')"
      :aria-label="t('common.toggleSidebar')"
    >
      <component :is="props.rightDrawerIcon" />
    </QBtn>
  </QBtnGroup>
</template>

<style scoped>
.view-header-delete {
  margin-right: 0.25rem;
}

.view-header-tabs {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

.view-header-separator {
  margin: 0 0.25rem;
}

.view-header-subtitle {
  font-size: 0.75rem;
  line-height: 1.1;
  opacity: 0.8;
}
</style>
