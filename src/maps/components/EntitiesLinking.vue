<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconPlus, IconX } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityCreateDialog from '@/maps/components/EntityCreateDialog.vue';
import type { MapEntityKind, MapEntityRef } from '@/maps/types';
import { dedupeEntityRefs } from '@/maps/utils/entityRefs';
import { useMapEntityCatalog } from '@/maps/composables/useMapEntityCatalog';

const props = withDefaults(
  defineProps<{
    kind: MapEntityKind;
    modelValue: MapEntityRef[];
    multiple?: boolean;
    label?: string;
    options?: Array<{ id: string; label: string }>;
  }>(),
  { multiple: true },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: MapEntityRef[]): void;
}>();

const { t } = useI18n();
const { groups, getLabel } = useMapEntityCatalog();
const instanceId = useId();
const isModalOpen = ref(false);
const isCreateOpen = ref(false);
const search = ref('');
const selectedIds = ref<string[]>([]);
const createdIds = ref<string[]>([]);
const createdLabels = ref<Record<string, string>>({});

const group = computed(() =>
  groups.value.find((entry) => entry.kind === props.kind),
);

const kindLabel = computed(
  () => props.label || (group.value ? t(group.value.labelKey) : ''),
);

const linkedRefs = computed(() =>
  props.modelValue.filter((ref) => ref.kind === props.kind),
);

const sourceOptions = computed(() => {
  const base = props.options ?? group.value?.items ?? [];
  const existing = new Set(base.map((item) => item.id));
  const extras = Object.entries(createdLabels.value)
    .filter(([id]) => !existing.has(id))
    .map(([id, label]) => ({ id, label }));
  return [...base, ...extras];
});

const availableOptions = computed(() =>
  sourceOptions.value.filter(
    (item) => !linkedRefs.value.some((ref) => ref.id === item.id),
  ),
);

function labelFor(ref: MapEntityRef): string {
  const createdLabel = createdLabels.value[ref.id];
  if (createdLabel) return createdLabel;
  if (props.options) {
    return props.options.find((item) => item.id === ref.id)?.label ?? ref.id;
  }
  return getLabel(ref);
}

const filteredOptions = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return availableOptions.value;
  return availableOptions.value.filter((item) =>
    item.label.toLowerCase().includes(query),
  );
});

function openModal() {
  search.value = '';
  selectedIds.value = [];
  createdIds.value = [];
  createdLabels.value = {};
  isModalOpen.value = true;
}

function closeModal() {
  isCreateOpen.value = false;
  isModalOpen.value = false;
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

function toggleOption(id: string) {
  if (!props.multiple) {
    selectedIds.value = [id];
    return;
  }
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((selected) => selected !== id)
    : [...selectedIds.value, id];
}

function addSelected() {
  if (selectedIds.value.length === 0) return;
  emit(
    'update:modelValue',
    dedupeEntityRefs([
      ...props.modelValue,
      ...selectedIds.value.map((id) => ({ kind: props.kind, id })),
    ]),
  );
  isModalOpen.value = false;
}

function removeLink(ref: MapEntityRef) {
  emit(
    'update:modelValue',
    props.modelValue.filter(
      (entry) => !(entry.kind === ref.kind && entry.id === ref.id),
    ),
  );
}
</script>

<template>
  <div>
    <QList separator>
      <QItem>
        <QItemSection class="text-subtitle2">{{ kindLabel }}</QItemSection>
        <QItemSection side>
          <QBtn
            flat
            round
            color="primary"
            :title="t('common.add')"
            :aria-label="t('common.add')"
            @click="openModal"
          >
            <IconPlus :size="18" />
          </QBtn>
        </QItemSection>
      </QItem>
    </QList>

    <QVirtualScroll
      v-if="linkedRefs.length > 0"
      :items="linkedRefs"
      type="list"
      virtual-scroll-item-size="48"
      class="q-pa-none"
      style="max-height: 320px"
    >
      <template #default="{ item: ref }">
        <QItem class="linked-entity-item">
          <QItemSection>{{ labelFor(ref) }}</QItemSection>
          <QItemSection side>
            <QBtn
              flat
              dense
              round
              color="negative"
              class="linked-entity-remove"
              :title="t('common.remove')"
              :aria-label="t('common.remove')"
              @click="removeLink(ref)"
            >
              <IconX :size="16" />
            </QBtn>
          </QItemSection>
        </QItem>
      </template>
    </QVirtualScroll>

    <div v-else class="text-caption text-grey-7 q-pa-sm">
      {{ t('maps.noLinkedEntities') }}
    </div>

    <BaseModal
      :isOpen="isModalOpen"
      :title="kindLabel"
      :showSubmit="true"
      :showCancel="true"
      :submitLabel="t('common.add')"
      :cancelLabel="t('common.cancel')"
      :disableSubmit="selectedIds.length === 0"
      :use-modal-stack="false"
      :modalId="`entities-linking-${kind}-${instanceId}`"
      @submit="addSelected"
      @cancel="closeModal"
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
                  <QBadge
                    v-if="createdIds.includes(option.id)"
                    color="positive"
                  >
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
  </div>
</template>

<style scoped>
.linked-entity-item {
  border-radius: var(--border-radius-sm);
  transition: background-color 0.15s ease;
}

.linked-entity-item:hover,
.linked-entity-item:focus-within {
  background: var(--color-background-soft);
}

.linked-entity-remove {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.linked-entity-item:hover .linked-entity-remove,
.linked-entity-item:focus-within .linked-entity-remove {
  opacity: 1;
  pointer-events: auto;
}
</style>
