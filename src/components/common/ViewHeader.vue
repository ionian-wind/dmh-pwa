<script setup lang="ts">
import Button from '@/components/common/Button.vue';
import { IconPlus } from '@tabler/icons-vue';

defineProps({
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

defineEmits(['create', 'update:searchQuery']);
</script>

<template>
  <div class="view-header">
    <div class="view-header-content">
      <div v-if="title" class="header-wrapper header-title">
        <b>{{ $t(title) }}</b>
        <slot name="subtitle" />
      </div>

      <div v-if="showSearch" class="header-wrapper">
        <input
          v-if="showSearch"
          :value="searchQuery"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          type="text"
          :placeholder="$t(searchPlaceholder)"
          class="search-input"
        >
        <slot name="search-filter"></slot>
      </div>


      <div v-if="!showSearch && !$slots.default" class="header-wrapper"></div>

      <slot name="actions" />

      <Button v-if="showCreate" @click="$emit('create')" :title="$t(createTitle)">
        <IconPlus />
      </Button>
    </div>
  </div>
</template>
