<template>
  <BaseModal
    :is-open="isOpen"
    modal-id="ambient-scene-link-picker"
    :title="t('ambientSoundPage.addSceneLink')"
    :show-submit="false"
    :show-cancel="true"
    :cancel-label="t('common.close')"
    @cancel="emit('close')"
    @update:is-open="(value: boolean) => !value && emit('close')"
  >
    <QInput
      v-model="search"
      dense
      outlined
      clearable
      :placeholder="t('common.search')"
      class="q-mb-md"
    >
      <template #prepend><IconSearch :size="18" /></template>
    </QInput>

    <div v-if="groups.length" class="column q-gutter-md">
      <section v-for="group in groups" :key="group.type">
        <div class="text-caption text-uppercase text-grey-7 q-mb-xs">
          {{ group.label }}
        </div>
        <QList separator>
          <QItem
            v-for="entity in group.entities"
            :key="entity.id"
            clickable
            :disable="entity.linked"
            @click="addLink(group.type, entity.id)"
          >
            <QItemSection>
              <div>{{ entity.name }}</div>
              <div class="text-caption text-grey-7">{{ entity.id }}</div>
            </QItemSection>
            <QItemSection side>
              <QIcon v-if="entity.linked" name="check" color="primary" />
              <QIcon v-else name="add" />
            </QItemSection>
          </QItem>
        </QList>
      </section>
    </div>
    <div v-else class="text-caption text-grey-7 q-pa-md">
      {{ t('ambientSoundPage.noLinkEntities') }}
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconSearch } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import { useMapLocationStore } from '@/maps/locations';
import { useModuleStore } from '@/stores/modules';
import { useEncounterStore } from '@/stores/encounters';
import { useCharacterStore } from '@/stores/characters';
import type { SceneLinkEntityType } from '@/ambient-sound/types';

const props = defineProps<{
  isOpen: boolean;
  packageId: string;
  sceneId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();
const store = useAmbientSoundStore();
const locationStore = useMapLocationStore();
const moduleStore = useModuleStore();
const encounterStore = useEncounterStore();
const characterStore = useCharacterStore();
const search = ref('');

const linked = computed(() => {
  const set = new Set<string>();
  for (const link of store.linksForScene(props.packageId, props.sceneId)) {
    set.add(`${link.entityType}:${link.entityId}`);
  }
  return set;
});

function entityName(entity: any): string {
  return entity.title || entity.name || entity.id;
}

function matches(entity: any): boolean {
  const query = search.value.trim().toLowerCase();
  if (!query) return true;
  return `${entityName(entity)} ${entity.id}`.toLowerCase().includes(query);
}

const groups = computed(() => {
  const definitions: Array<{
    type: SceneLinkEntityType;
    label: string;
    items: any[];
  }> = [
    {
      type: 'location',
      label: t('maps.locations'),
      items: locationStore.items,
    },
    {
      type: 'module',
      label: t('navigation.modules'),
      items: moduleStore.items,
    },
    {
      type: 'encounter',
      label: t('navigation.encounters'),
      items: encounterStore.items,
    },
    {
      type: 'character',
      label: t('navigation.characters'),
      items: characterStore.items,
    },
  ];

  return definitions
    .map(({ type, label, items }) => ({
      type,
      label,
      entities: items.filter(matches).map((entity) => ({
        id: entity.id,
        name: entityName(entity),
        linked: linked.value.has(`${type}:${entity.id}`),
      })),
    }))
    .filter((group) => group.entities.length > 0);
});

watch(
  () => props.isOpen,
  async (open) => {
    if (!open) return;
    search.value = '';
    await Promise.all([
      locationStore.items.length ? Promise.resolve() : locationStore.load(),
      moduleStore.items.length ? Promise.resolve() : moduleStore.load(),
      encounterStore.items.length ? Promise.resolve() : encounterStore.load(),
      characterStore.items.length ? Promise.resolve() : characterStore.load(),
    ]);
  },
);

function addLink(type: SceneLinkEntityType, entityId: string) {
  store.addSceneLink(props.packageId, props.sceneId, type, entityId);
  emit('close');
}
</script>
