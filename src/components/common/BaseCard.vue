<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import Button from '../form/Button.vue';
import { computed, useSlots, Fragment, Comment } from 'vue';
import { IconEye, IconPencil, IconCopy, IconTrash } from '@tabler/icons-vue';
import { debug } from '@/utils/debug';

const { t } = useI18n();

const props = defineProps({
  showView: { type: Boolean, default: false },
  showEdit: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false },
  title: { type: String, default: '' },
});

const emit = defineEmits(['view', 'edit', 'delete', 'copy']);

const slots = useSlots();

function isVNodeContent(vnode: any): boolean {
  if (vnode.type === Comment) return false;
  if (typeof vnode.children === 'string') {
    return vnode.children.trim().length > 0;
  }
  if (vnode.type === Fragment && Array.isArray(vnode.children)) {
    return vnode.children.some(isVNodeContent);
  }
  // For other nodes (elements/components), treat as content
  return true;
}

const hasContent = computed(() => {
  const vnodes = slots.default ? slots.default() : [];
  return vnodes.some(isVNodeContent);
});

// Fallback: check if actions slot or built-in actions are present
const noBorderAfterHeader = computed(() => {
  // If there is no header, don't care
  if (!slots.header) return false;
  // If there are actions or built-in actions, header is followed by actions
  return !!(slots.actions || props.showView || props.showEdit || props.showDelete);
});
</script>

<template>
  <div class="base-card">
    <div
      style="cursor: pointer"
      v-if="$slots.header"
      class="base-card-header"
      :class="{ 'no-border': noBorderAfterHeader }"
      @click="$emit('view')"
    >
      <slot name="header">
        <span v-if="title">{{ t(title) }}</span>
      </slot>
    </div>
    <div v-if="hasContent" class="base-card-content">
      <slot />
    </div>
    <div v-if="$slots.actions || showView || showEdit || showDelete" class="base-card-actions">
      <div class="base-card-actions-left">
        <slot name="actions" />
      </div>
      <div class="base-card-actions-right">
        <Button v-if="showView" variant="light" size="small" @click="$emit('view')" :title="t('common.view')">
          <IconEye />
        </Button>
        <Button v-if="showEdit" variant="primary" size="small" @click="$emit('edit')" :title="t('common.edit')">
          <IconPencil />
        </Button>
        <Button variant="secondary" size="small" @click="() => { debug('BaseCard copy button clicked'); $emit('copy'); }" :title="t('common.copy')">
          <IconCopy />
        </Button>
        <Button v-if="showDelete" variant="danger" size="small" @click="$emit('delete')" :title="t('common.delete')">
          <IconTrash />
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.base-card {
  background: var(--color-background, #fff);
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s;
  position: relative;
  max-height: 90vh;
}
.base-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.10);
}
.base-card-header {
  padding: 1rem 1rem 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border, #eee);
}

/* Remove bottom border if actions follow header */
.base-card-header:has(+ .base-card-actions) {
  border-bottom: none;
}

/* Fallback for browsers without :has() support */
@supports not (selector(:has(*))) {
  .base-card-header.no-border {
    border-bottom: none !important;
  }
}

.base-card-content {
  padding: 1rem;
  overflow-y: auto;
  flex: 1 1 auto;
}
.base-card-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border, #eee);
  background: var(--color-background, #fff);
  position: sticky;
  bottom: 0;
  z-index: 2;
}
.base-card-actions-left {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.base-card-actions-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-left: auto;
}
</style> 
