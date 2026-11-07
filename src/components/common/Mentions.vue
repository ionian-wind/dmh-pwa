<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { cropTitle } from '@/utils/cropTitle';
import { useI18n } from 'vue-i18n';
import { featureLinkKinds } from 'virtual:feature-links';
import EntityGroup from './EntityGroup.vue';

interface EntityRef {
  kind: string;
  id: string;
}

const props = defineProps<{ title: string; entities: EntityRef[] }>();
const { t } = useI18n();
const stores = Object.fromEntries(
  featureLinkKinds.map((option) => [option.kind, option.useStore()]),
);

onMounted(async () => {
  await Promise.all(featureLinkKinds.map((option) => option.useStore().load()));
});

function getOption(kind: string) {
  return featureLinkKinds.find((option) => option.kind === kind);
}

function getEntityRoute(entity: EntityRef) {
  return getOption(entity.kind)?.route(entity.id) ?? '#';
}

function getEntityLabel(kind: string) {
  const option = getOption(kind);
  return option
    ? t(option.labelKey)
    : kind.charAt(0).toUpperCase() + kind.slice(1);
}

function getEntityDisplay(entity: EntityRef) {
  const option = getOption(entity.kind);
  const store = stores[entity.kind];
  if (!option || !store) return entity.id;
  const record = store.getById?.(entity.id);
  const label = record?.[option.titleField] || entity.id;
  return cropTitle(label);
}

const groupedEntities = computed(() => {
  const groups: Record<string, EntityRef[]> = {};
  for (const entity of props.entities) {
    if (!groups[entity.kind]) groups[entity.kind] = [];
    groups[entity.kind].push(entity);
  }
  return groups;
});
</script>

<template>
  <EntityGroup class="mentions-aside" :title="title">
    <template v-if="entities.length">
      <div
        v-for="(group, kind) in groupedEntities"
        :key="kind"
        class="mentions-group"
      >
        <h6 class="mentions-group-title">{{ getEntityLabel(kind) }}</h6>
        <ul class="mentions-list">
          <li v-for="entity in group" :key="entity.kind + ':' + entity.id">
            <router-link :to="getEntityRoute(entity)">
              {{ getEntityDisplay(entity) }}
            </router-link>
          </li>
        </ul>
      </div>
    </template>
    <template v-else>
      <div class="mentions-empty">{{ t('mentions.empty') }}</div>
    </template>
  </EntityGroup>
</template>
