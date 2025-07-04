<script setup lang="ts">
import { QToolbar, QToolbarTitle, QInput } from 'quasar';
import Button from '@/components/form/Button.vue';
import { IconPlus } from '@tabler/icons-vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  showCreate: {
    type: Boolean,
    default: false,
  },
  createTitle: {
    type: String,
    default: 'Create',
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
    default: 'Search...'
  }
});

const emit = defineEmits(['create', 'update:searchQuery']);
</script>

<template>
  <QToolbar class="view-header">
    <QToolbarTitle v-if="props.title">
      {{ t(props.title) }}
      <slot name="subtitle" />
    </QToolbarTitle>

    <div v-if="props.showSearch" class="q-mx-md" style="flex:1;max-width:400px;">
      <QInput
        dense
        outlined
        :model-value="props.searchQuery"
        @update:model-value="val => emit('update:searchQuery', val)"
        :placeholder="t(props.searchPlaceholder)"
        class="search-input"
        clearable
      />
      <slot name="search-filter"></slot>
    </div>

    <slot name="actions" />

    <Button
      v-if="props.showCreate"
      variant="primary"
      size="small"
      @click="() => emit('create')"
      :title="t(props.createTitle)"
      class="q-ml-md"
      aria-label="Create"
    >
      <IconPlus />
    </Button>
  </QToolbar>
</template>
