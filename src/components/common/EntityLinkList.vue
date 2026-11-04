<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconX } from '@tabler/icons-vue';
import type { MapEntityRef } from '@/maps/types';
import {
  MAP_ENTITY_KIND_OPTIONS,
  getEntityKindOption,
} from '@/maps/utils/entityRefs';
import { useMapEntityCatalog } from '@/maps/composables/useMapEntityCatalog';

const props = withDefaults(
  defineProps<{
    links: MapEntityRef[];
    removable?: boolean;
  }>(),
  { removable: false },
);

const emit = defineEmits<{
  (e: 'remove', ref: MapEntityRef): void;
}>();

const { t } = useI18n();
const { getLabel } = useMapEntityCatalog();

const resolved = computed(() =>
  props.links.map((ref) => ({
    ref,
    label: getLabel(ref),
    kindLabel: t(
      getEntityKindOption(ref.kind)?.labelKey ??
        MAP_ENTITY_KIND_OPTIONS[0].labelKey,
    ),
  })),
);
</script>

<template>
  <div class="row q-gutter-xs">
    <span
      v-for="link in resolved"
      :key="`${link.ref.kind}:${link.ref.id}`"
      class="row items-center q-gutter-xs q-px-sm q-py-xs bg-grey-2 rounded-borders"
      :title="`${link.kindLabel}: ${link.label}`"
    >
      <span class="text-caption text-grey-7">{{ link.kindLabel }}</span>
      <span>{{ link.label }}</span>
      <QBtn
        v-if="removable"
        flat
        dense
        round
        size="xs"
        color="negative"
        class="entity-link-remove"
        :aria-label="t('common.remove')"
        @click.stop="emit('remove', link.ref)"
      >
        <IconX :size="14" />
      </QBtn>
    </span>
  </div>
</template>
