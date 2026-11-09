<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import EntityCreateDialog from '@/components/common/EntityCreateDialog.vue';
import { getEntityKindOption } from '@/components/common/entityLinking/entityRefs';
import type { MapEntityKind } from '@/maps/types';

const props = withDefaults(
  defineProps<{
    options: Array<{ id: string; label: string }>;
    modelValue: string[];
    multiple?: boolean;
    createdIds?: string[];
    /** Enable the standard create action for this link kind. */
    kind?: string;
  }>(),
  { multiple: true, createdIds: () => [] },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
  (
    e: 'created',
    payload: { ref: { kind: string; id: string }; label: string },
  ): void;
}>();

const { t } = useI18n();
const search = ref('');
const selected = ref<string[]>([...props.modelValue]);
const isCreateOpen = ref(false);
const canCreate = computed(
  () => !!props.kind && !!getEntityKindOption(props.kind)?.create,
);
const createKind = computed(() => props.kind as MapEntityKind);

watch(
  () => props.modelValue,
  (value) => {
    selected.value = [...value];
  },
);

const filteredOptions = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return props.options;
  return props.options.filter((item) =>
    item.label.toLowerCase().includes(query),
  );
});

function toggleOption(id: string) {
  if (!props.multiple) {
    selected.value = [id];
  } else {
    selected.value = selected.value.includes(id)
      ? selected.value.filter((current) => current !== id)
      : [...selected.value, id];
  }
  emit('update:modelValue', selected.value);
}

function handleCreated(payload: {
  ref: { kind: string; id: string };
  label: string;
}) {
  isCreateOpen.value = false;
  search.value = '';
  selected.value = props.multiple
    ? [...new Set([...selected.value, payload.ref.id])]
    : [payload.ref.id];
  emit('update:modelValue', selected.value);
  emit('created', payload);
}

function resetSearch() {
  search.value = '';
}

defineExpose({ resetSearch });
</script>

<template>
  <div class="column q-gutter-sm entity-linking-list">
    <div class="row items-center q-gutter-sm">
      <QInput
        v-model="search"
        :placeholder="t('common.search')"
        dense
        outlined
        clearable
        class="col"
      />
      <slot name="search-actions" />
      <QBtn
        v-if="canCreate"
        flat
        round
        color="positive"
        :title="t('common.create')"
        :aria-label="t('common.create')"
        @click="isCreateOpen = true"
      >
        <QIcon name="tabler-plus" size="20px" />
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
              :model-value="selected.includes(option.id)"
              @update:model-value="toggleOption(option.id)"
              @click.stop
            />
            <QRadio
              v-else
              :model-value="selected[0]"
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
          <QItemSection
            v-if="$slots['item-extra']"
            side
            class="entity-option-extra"
          >
            <slot
              name="item-extra"
              :item="option"
              :selected="selected.includes(option.id)"
            />
          </QItemSection>
        </QItem>
      </template>
    </QVirtualScroll>
    <div v-else class="text-caption text-grey-7">
      {{ t('common.empty') }}
    </div>
  </div>

  <EntityCreateDialog
    v-if="isCreateOpen"
    :kind="createKind"
    @created="handleCreated"
    @cancel="isCreateOpen = false"
  />
</template>
