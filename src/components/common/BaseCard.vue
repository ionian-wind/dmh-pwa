<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, useSlots, Fragment, Comment } from 'vue';
import { IconEye, IconPencil, IconTrash, IconCopy } from '@tabler/icons-vue';

const { t } = useI18n();

const props = defineProps({
  showView: { type: Boolean, default: false },
  showEdit: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false },
  showCopy: { type: Boolean, default: false },
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
  <QCard class="base-card">
    <QCardSection
      v-if="$slots.header || title"
      class="base-card-header"
      @click="$emit('view')"
      style="cursor: pointer"
    >
      <h5 v-if="title">{{ title }}</h5>
      <slot name="header" />
    </QCardSection>
    <QCardSection v-if="hasContent" class="base-card-content q-pt-none">
      <slot />
    </QCardSection>

    <QCardActions
      v-if="
        $slots.actions ||
        props.showView ||
        props.showEdit ||
        props.showDelete ||
        props.showCopy
      "
      class="base-card-actions"
      align="between"
    >
      <QSeparator />

      <QBtnGroup flat v-if="$slots.actions" class="base-card-actions-left">
        <slot name="actions" />
      </QBtnGroup>

      <QSpace
        v-if="
          $slots.actions &&
          (props.showView ||
            props.showEdit ||
            props.showDelete ||
            props.showCopy)
        "
      />

      <QBtnGroup
        flat
        v-if="
          props.showView || props.showEdit || props.showDelete || props.showCopy
        "
      >
        <QBtn
          flat
          v-if="props.showView"
          color="standard"
          size="small"
          @click="$emit('view')"
          :title="t('common.view')"
        >
          <IconEye />
        </QBtn>
        <QBtn
          flat
          v-if="props.showEdit"
          color="positive"
          size="small"
          @click="$emit('edit')"
          :title="t('common.edit')"
        >
          <IconPencil />
        </QBtn>
        <QBtn
          flat
          v-if="props.showCopy"
          color="primary"
          size="small"
          @click="$emit('copy')"
          :title="t('common.copy')"
        >
          <IconCopy />
        </QBtn>
        <QBtn
          flat
          v-if="props.showDelete"
          color="negative"
          size="small"
          @click="$emit('delete')"
          :title="t('common.delete')"
        >
          <IconTrash />
        </QBtn>
      </QBtnGroup>
    </QCardActions>
  </QCard>
</template>

<style scoped>
.base-card {
  position: relative;
  --card-actions-height: 52px;
}

.base-card:hover,
.base-card:focus-within {
  z-index: 5;
  padding-bottom: var(--card-actions-height);
  margin-bottom: calc(-1 * var(--card-actions-height));
}

.base-card :deep(.base-card-actions) {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--color-background) 35%
  );
  transition: opacity 0.15s ease;
}

.base-card:hover :deep(.base-card-actions),
.base-card:focus-within :deep(.base-card-actions) {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: none) {
  .base-card:hover,
  .base-card:focus-within {
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .base-card :deep(.base-card-actions) {
    position: static;
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
