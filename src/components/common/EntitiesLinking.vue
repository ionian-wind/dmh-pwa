<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconPlus, IconX } from '@tabler/icons-vue';
import EntityGroup from '@/components/common/EntityGroup.vue';
import EntityLinkingDialog from '@/components/common/EntityLinkingDialog.vue';
import type { MapEntityKind, MapEntityRef } from '@/maps/types';
import { dedupeEntityRefs } from '@/components/common/entityLinking/entityRefs';
import { useMapEntityCatalog } from '@/components/common/entityLinking/useMapEntityCatalog';

const props = withDefaults(
  defineProps<{
    kind: MapEntityKind;
    modelValue: MapEntityRef[];
    multiple?: boolean;
    label?: string;
    options?: Array<{ id: string; label: string }>;
    readonly?: boolean;
  }>(),
  { multiple: true, readonly: false },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: MapEntityRef[]): void;
}>();

const { t } = useI18n();
const { groups, getLabel } = useMapEntityCatalog();
const isModalOpen = ref(false);
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

const linkedIds = computed(() => linkedRefs.value.map((ref) => ref.id));

const sourceOptions = computed(() => {
  const base = props.options ?? group.value?.items ?? [];
  const existing = new Set(base.map((item) => item.id));
  const extras = Object.entries(createdLabels.value)
    .filter(([id]) => !existing.has(id))
    .map(([id, label]) => ({ id, label }));
  // Keep linked refs selectable even when they are absent from the catalog,
  // so they can be shown as checked and unlinked from the dialog.
  const linkedExtras = linkedRefs.value
    .filter((ref) => !existing.has(ref.id) && !createdLabels.value[ref.id])
    .map((ref) => ({ id: ref.id, label: labelFor(ref) }));
  return [...base, ...extras, ...linkedExtras];
});

function labelFor(ref: MapEntityRef): string {
  const createdLabel = createdLabels.value[ref.id];
  if (createdLabel) return createdLabel;
  if (props.options) {
    return props.options.find((item) => item.id === ref.id)?.label ?? ref.id;
  }
  return getLabel(ref);
}

function handleAdd(payload: {
  refs: MapEntityRef[];
  labels: Record<string, string>;
}) {
  createdLabels.value = { ...createdLabels.value, ...payload.labels };
  const otherKinds = props.modelValue.filter((ref) => ref.kind !== props.kind);
  emit('update:modelValue', dedupeEntityRefs([...otherKinds, ...payload.refs]));
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
    <EntityGroup :title="kindLabel">
      <template #actions>
        <QBtn
          v-if="!readonly"
          flat
          round
          class="entity-group-add"
          :title="t('common.add')"
          :aria-label="t('common.add')"
          @click="isModalOpen = true"
        >
          <IconPlus :size="18" />
        </QBtn>
      </template>

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
            <QItemSection v-if="!readonly" side>
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
    </EntityGroup>

    <EntityLinkingDialog
      v-if="!readonly"
      :is-open="isModalOpen"
      :kind="kind"
      :title="kindLabel"
      :options="sourceOptions"
      :linked-ids="linkedIds"
      :multiple="multiple"
      @add="handleAdd"
      @cancel="isModalOpen = false"
    />
  </div>
</template>

<style scoped>
.entity-group-add {
  color: var(--color-accent);
}

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
  transition: opacity 0.15s ease;
}

.linked-entity-item:hover .linked-entity-remove,
.linked-entity-item:focus-within .linked-entity-remove {
  opacity: 1;
}
</style>
