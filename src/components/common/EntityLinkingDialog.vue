<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconPlus } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityCreateDialog from '@/components/common/EntityCreateDialog.vue';
import EntityLinkingList from '@/components/common/EntityLinkingList.vue';
import { getEntityKindOption } from '@/components/common/entityLinking/entityRefs';
import type { MapEntityKind } from '@/maps/types';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    kind: string;
    title: string;
    options: Array<{ id: string; label: string }>;
    linkedIds: string[];
    multiple?: boolean;
    /** Show the create action when the link kind supports it. */
    allowCreate?: boolean;
  }>(),
  { multiple: true, allowCreate: true },
);

const emit = defineEmits<{
  (e: 'cancel'): void;
  (
    e: 'add',
    payload: {
      refs: Array<{ kind: string; id: string }>;
      labels: Record<string, string>;
    },
  ): void;
}>();

const { t } = useI18n();
const instanceId = useId();
const isCreateOpen = ref(false);
const listRef = ref<InstanceType<typeof EntityLinkingList> | null>(null);
const selectedIds = ref<string[]>([]);
const createdIds = ref<string[]>([]);
const createdLabels = ref<Record<string, string>>({});
const canCreate = computed(
  () => props.allowCreate && !!getEntityKindOption(props.kind)?.create,
);
const createKind = computed(() => props.kind as MapEntityKind);

const availableOptions = computed(() => {
  const existing = new Set(props.options.map((item) => item.id));
  const extras = Object.entries(createdLabels.value)
    .filter(([id]) => !existing.has(id))
    .map(([id, label]) => ({ id, label }));
  return [...props.options, ...extras];
});

function reset() {
  listRef.value?.resetSearch();
  selectedIds.value = [...props.linkedIds];
  createdIds.value = [];
  createdLabels.value = {};
  isCreateOpen.value = false;
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) reset();
  },
);

function handleCreated(payload: {
  ref: { kind: string; id: string };
  label: string;
}) {
  const { ref, label } = payload;
  isCreateOpen.value = false;
  listRef.value?.resetSearch();
  createdIds.value = [...new Set([...createdIds.value, ref.id])];
  createdLabels.value = { ...createdLabels.value, [ref.id]: label };
  if (props.multiple) {
    if (!selectedIds.value.includes(ref.id)) {
      selectedIds.value = [...selectedIds.value, ref.id];
    }
  } else {
    selectedIds.value = [ref.id];
  }
}

function close() {
  isCreateOpen.value = false;
  emit('cancel');
}

function addSelected() {
  const labels = Object.fromEntries(
    selectedIds.value
      .filter((id) => createdLabels.value[id])
      .map((id) => [id, createdLabels.value[id]]),
  );
  emit('add', {
    refs: selectedIds.value.map((id) => ({ kind: props.kind, id })),
    labels,
  });
  isCreateOpen.value = false;
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="title"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.add')"
    :cancelLabel="t('common.cancel')"
    :disableSubmit="selectedIds.length === 0 && linkedIds.length === 0"
    :use-modal-stack="false"
    :modalId="`entities-linking-${kind}-${instanceId}`"
    @submit="addSelected"
    @cancel="close"
  >
    <EntityLinkingList
      ref="listRef"
      v-model="selectedIds"
      :options="availableOptions"
      :multiple="multiple"
      :created-ids="createdIds"
    >
      <template #search-actions>
        <QBtn
          v-if="canCreate"
          flat
          round
          color="positive"
          :title="t('common.create')"
          :aria-label="t('common.create')"
          @click="isCreateOpen = true"
        >
          <IconPlus :size="20" />
        </QBtn>
      </template>
      <template v-if="$slots['item-extra']" #item-extra="{ item, selected }">
        <slot name="item-extra" :item="item" :selected="selected" />
      </template>
    </EntityLinkingList>
  </BaseModal>

  <EntityCreateDialog
    v-if="isCreateOpen"
    :kind="createKind"
    @created="handleCreated"
    @cancel="isCreateOpen = false"
  />
</template>
