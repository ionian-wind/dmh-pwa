<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, useSlots, Fragment, Comment } from 'vue';
import { IconEye, IconPencil, IconTrash } from '@tabler/icons-vue';

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
        $slots.actions || props.showView || props.showEdit || props.showDelete
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
          (props.showView || props.showEdit || props.showDelete)
        "
      />

      <QBtnGroup
        flat
        v-if="props.showView || props.showEdit || props.showDelete"
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
