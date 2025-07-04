<script setup lang="ts">
import { QCard, QCardSection, QCardActions } from 'quasar';
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
</script>

<template>
  <QCard>
    <QCardSection v-if="$slots.header || title" class="base-card-header" @click="$emit('view')" style="cursor: pointer">
      <slot name="header">
        <span>{{ t(title) }}</span>
      </slot>
    </QCardSection>
    <QCardSection v-if="hasContent" class="base-card-content">
      <slot />
    </QCardSection>
    <div v-if="$slots.actions || showView || showEdit || showDelete">
      <QSeparator />

      <QCardActions class="base-card-actions" align="between">
        <div class="base-card-actions-left">
          <slot name="actions" />
        </div>
        
        <div class="base-card-actions-right">
          <QBtn v-if="showView" variant="light" size="small" @click="$emit('view')" :title="t('common.view')">
            <IconEye />
          </QBtn>
          <QBtn v-if="showEdit" variant="primary" size="small" @click="$emit('edit')" :title="t('common.edit')">
            <IconPencil />
          </QBtn>
          <QBtn variant="secondary" size="small" @click="$emit('copy')" :title="t('common.copy')">
            <IconCopy />
          </QBtn>
          <QBtn v-if="showDelete" variant="danger" size="small" @click="$emit('delete')" :title="t('common.delete')">
            <IconTrash />
          </QBtn>
        </div>
      </QCardActions>
    </div>
  </QCard>
</template>
