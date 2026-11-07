<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconPlus } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityCreateDialog from '@/components/common/EntityCreateDialog.vue';
import type { MapEntityKind, MapEntityRef } from '@/maps/types';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    kind: MapEntityKind;
    title: string;
    options: Array<{ id: string; label: string }>;
    linkedIds: string[];
    multiple?: boolean;
  }>(),
  { multiple: true },
);

const emit = defineEmits<{
  (e: 'cancel'): void;
  (
    e: 'add',
    payload: { refs: MapEntityRef[]; labels: Record<string, string> },
  ): void;
}>();

const { t } = useI18n();
const instanceId = useId();
const isCreateOpen = ref(false);
const search = ref('');
const selectedIds = ref<string[]>([]);
const createdIds = ref<string[]>([]);
const createdLabels = ref<Record<string, string>>({});

const availableOptions = computed(() => {
  const existing = new Set(props.options.map((item) => item.id));
  const extras = Object.entries(createdLabels.value)
    .filter(([id]) => !existing.has(id))
    .map(([id, label]) => ({ id, label }));
  return [...props.options, ...extras];
});

const filteredOptions = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return availableOptions.value;
  return availableOptions.value.filter((item) =>
    item.label.toLowerCase().includes(query),
  );
});

function reset() {
  search.value = '';
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

function toggleOption(id: string) {
  if (!props.multiple) {
    selectedIds.value = [id];
    return;
  }
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((selected) => selected !== id)
    : [...selectedIds.value, id];
}

function handleCreated(payload: { ref: MapEntityRef; label: string }) {
  const { ref, label } = payload;
  isCreateOpen.value = false;
  search.value = '';
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
    <div class="column q-gutter-sm">
      <div class="row items-center q-gutter-sm">
        <QInput
          v-model="search"
          :placeholder="t('common.search')"
          dense
          outlined
          clearable
          class="col"
        />
        <QBtn
          flat
          round
          color="positive"
          :title="t('common.create')"
          :aria-label="t('common.create')"
          @click="isCreateOpen = true"
        >
          <IconPlus :size="20" />
        </QBtn>
      </div>

      <QVirtualScroll
        v-if="filteredOptions.length > 0"
        :items="filteredOptions"
        type="list"
        virtual-scroll-item-size="48"
        class="q-pa-none"
        style="max-height: 320px"
      >
        <template #default="{ item: option }">
          <QItem
            clickable
            class="entity-option"
            :class="{
              'entity-option--created': createdIds.includes(option.id),
            }"
            @click="toggleOption(option.id)"
          >
            <QItemSection side>
              <QCheckbox
                v-if="multiple"
                :model-value="selectedIds.includes(option.id)"
                @update:model-value="toggleOption(option.id)"
                @click.stop
              />
              <QRadio
                v-else
                :model-value="selectedIds[0]"
                :val="option.id"
                @update:model-value="toggleOption(option.id)"
                @click.stop
              />
            </QItemSection>
            <QItemSection>
              <div class="row items-center q-gutter-xs">
                <span>{{ option.label }}</span>
                <QBadge v-if="createdIds.includes(option.id)" color="positive">
                  {{ t('common.created') }}
                </QBadge>
              </div>
            </QItemSection>
          </QItem>
        </template>
      </QVirtualScroll>
      <div v-else class="text-caption text-grey-7">
        {{ t('common.empty') }}
      </div>
    </div>
  </BaseModal>

  <EntityCreateDialog
    v-if="isCreateOpen"
    :kind="kind"
    @created="handleCreated"
    @cancel="isCreateOpen = false"
  />
</template>
