<template>
  <div class="sound-pack-selector">
    <QSelect
      v-model="selectedPackId"
      :options="packOptions"
      :label="$t('ambientSoundPage.selectPack')"
      emit-value
      map-options
      dense
      outlined
      @update:model-value="handlePackSelect"
    >
      <template #option="{ opt, itemProps }">
        <QItem v-bind="itemProps">
          <QItemSection avatar>
            <component :is="opt.icon" size="24" />
          </QItemSection>
          <QItemSection>
            <QItemLabel>{{ opt.label }}</QItemLabel>
            <QItemLabel caption>{{ opt.category }}</QItemLabel>
          </QItemSection>
        </QItem>
      </template>

      <template #selected-item="{ opt }">
        <div class="selected-pack">
          <component :is="opt.icon" size="20" />
          <span>{{ opt.label }}</span>
        </div>
      </template>
    </QSelect>

    <QBtn
      v-if="store.currentPack"
      flat
      round
      size="sm"
      icon="x"
      @click="store.unloadPack()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Component } from 'vue';
import {
  IconFolder,
  IconTree,
  IconRocket,
  IconAlertTriangle,
  IconBuilding,
  IconEdit,
} from '@tabler/icons-vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const store = useAmbientSoundStore();
const selectedPackId = ref<string | null>(null);

interface PackOption {
  label: string;
  value: string;
  icon: Component;
  category: string;
}

const packOptions = computed<PackOption[]>(() => {
  const options: PackOption[] = store.storedPacks.map((pack) => ({
    label: pack.name,
    value: pack.id,
    icon: getCategoryIcon(pack.category),
    category: pack.category,
  }));

  if (options.length === 0) {
    return [
      {
        label: 'No packs available',
        value: '',
        icon: IconFolder,
        category: '',
      },
    ];
  }

  return options;
});

function getCategoryIcon(category: string): Component {
  const icons: Record<string, Component> = {
    fantasy: IconTree,
    scifi: IconRocket,
    horror: IconAlertTriangle,
    modern: IconBuilding,
    custom: IconEdit,
  };
  return icons[category] || IconFolder;
}

async function handlePackSelect(packId: string) {
  const pack = store.storedPacks.find((p) => p.id === packId);
  if (pack) {
    await store.loadPack(pack);
  }
}

watch(
  () => store.currentPack,
  (newPack) => {
    selectedPackId.value = newPack?.id || null;
  },
  { immediate: true },
);
</script>

<style scoped>
.sound-pack-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.sound-pack-selector :deep(.QSelect) {
  flex: 1;
}

.selected-pack {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
