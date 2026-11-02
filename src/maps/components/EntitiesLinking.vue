<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconPlus, IconX } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import type { MapEntityKind, MapEntityRef } from '@/maps/types';
import { dedupeEntityRefs } from '@/maps/utils/entityRefs';
import { useMapEntityCatalog } from '@/maps/composables/useMapEntityCatalog';

const props = defineProps<{
  kind: MapEntityKind;
  modelValue: MapEntityRef[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: MapEntityRef[]): void;
}>();

const { t } = useI18n();
const { groups, getLabel } = useMapEntityCatalog();
const instanceId = useId();
const isModalOpen = ref(false);
const search = ref('');
const selectedIds = ref<string[]>([]);

const group = computed(() =>
  groups.value.find((entry) => entry.kind === props.kind),
);

const kindLabel = computed(() => (group.value ? t(group.value.labelKey) : ''));

const linkedRefs = computed(() =>
  props.modelValue.filter((ref) => ref.kind === props.kind),
);

const availableOptions = computed(() =>
  (group.value?.items ?? []).filter(
    (item) => !linkedRefs.value.some((ref) => ref.id === item.id),
  ),
);

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
  isModalOpen.value = true;
}

function toggleOption(id: string) {
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
        <QItem>
          <QItemSection>{{ getLabel(ref) }}</QItemSection>
          <QItemSection side>
            <QBtn
              flat
              dense
              round
              color="negative"
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
      :modalId="`entities-linking-${kind}-${instanceId}`"
      @submit="addSelected"
      @cancel="isModalOpen = false"
    >
      <div class="column q-gutter-sm">
        <QInput
          v-model="search"
          :placeholder="t('common.search')"
          dense
          outlined
          clearable
        />

        <QVirtualScroll
          v-if="filteredOptions.length > 0"
          :items="filteredOptions"
          type="list"
          virtual-scroll-item-size="48"
          class="q-pa-none"
          style="max-height: 320px"
        >
          <template #default="{ item: option }">
            <QItem clickable @click="toggleOption(option.id)">
              <QItemSection side>
                <QCheckbox
                  :model-value="selectedIds.includes(option.id)"
                  @update:model-value="toggleOption(option.id)"
                  @click.stop
                />
              </QItemSection>
              <QItemSection>{{ option.label }}</QItemSection>
            </QItem>
          </template>
        </QVirtualScroll>
        <div v-else class="text-caption text-grey-7">
          {{ t('common.empty') }}
        </div>
      </div>
    </BaseModal>
  </div>
</template>
