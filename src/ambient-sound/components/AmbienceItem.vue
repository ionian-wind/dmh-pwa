<template>
  <QCard flat bordered :class="{ 'is-active': activeVariationId !== null }">
    <QCardSection class="row items-center q-gutter-sm">
      <AmbientIcon :icon="ambience.icon" :size="24" />
      <div class="col">
        <div class="text-subtitle2 text-weight-medium">
          {{ ambience.name }}
        </div>
        <div class="text-caption text-grey-7">{{ subtitle }}</div>
        <div v-if="usedIn !== undefined" class="text-caption text-grey-6">
          {{ usedIn }} {{ t('ambientSoundPage.scenes') }}
        </div>
      </div>
      <QBtnGroup flat>
        <QBtn
          v-for="variation in variations"
          :key="variation.id"
          :class="{
            'variant-active': activeVariationId === variation.id,
          }"
          :outline="activeVariationId !== variation.id"
          :disable="disabled"
          :label="variation.name"
          size="sm"
          @click="emit('select-variation', variation.id)"
        />
      </QBtnGroup>
    </QCardSection>
  </QCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { getLayerVariations } from '@/ambient-sound/utils/packData';
import type { LayerDef } from '@/ambient-sound/types';

const props = withDefaults(
  defineProps<{
    ambience: LayerDef;
    activeVariationId?: string | null;
    disabled?: boolean;
    packName?: string;
    usedIn?: number;
  }>(),
  {
    activeVariationId: null,
    disabled: false,
    packName: '',
    usedIn: undefined,
  },
);

const emit = defineEmits<{
  (e: 'select-variation', variationId: string): void;
}>();

const { t } = useI18n();

const variations = computed(() => getLayerVariations(props.ambience));

const subtitle = computed(() => {
  const parts = [props.packName, props.ambience.category].filter(Boolean);
  return parts.length ? parts.join(' · ') : t('ambientSoundPage.ambiences');
});
</script>

<style scoped>
.is-active {
  border-color: var(--color-primary);
  background: var(--color-background-soft);
}

.variant-active {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}
</style>
