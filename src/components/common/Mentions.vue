<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useCharacterStore } from '@/stores/characters';
import { useMapLocationStore } from '@/maps/locations';
import { cropTitle } from '@/utils/cropTitle';
import { useI18n } from 'vue-i18n';
import EntityGroup from './EntityGroup.vue';

interface EntityRef {
  kind: string;
  id: string;
}

const props = defineProps<{ title: string; entities: EntityRef[] }>();
const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();
const characterStore = useCharacterStore();
const locationStore = useMapLocationStore();
const { t } = useI18n();

onMounted(async () => {
  await noteStore.load();
  await moduleStore.load();
  await partyStore.load();
  await monsterStore.load();
  await encounterStore.load();
  await characterStore.load();
  await locationStore.load();
});

function getEntityRoute(entity: EntityRef) {
  switch (entity.kind) {
    case 'monster':
      return `/monsters/${entity.id}`;
    case 'party':
      return `/parties/${entity.id}`;
    case 'encounter':
      return `/encounters/${entity.id}`;
    case 'module':
      return `/modules/${entity.id}`;
    case 'note':
      return `/notes/${entity.id}`;
    case 'character':
      return `/characters/${entity.id}`;
    case 'location':
      return `/locations/${entity.id}`;
    default:
      return '#';
  }
}

function getEntityLabel(kind: string) {
  switch (kind) {
    case 'note':
      return t('notes.title');
    case 'module':
      return t('modules.title');
    case 'party':
      return t('parties.title');
    case 'monster':
      return t('monsters.title');
    case 'encounter':
      return t('encounters.title');
    case 'character':
      return t('characters.title');
    case 'location':
      return t('maps.locations');
    default:
      return kind.charAt(0).toUpperCase() + kind.slice(1);
  }
}

function getEntityDisplay(entity: EntityRef) {
  let label = '';
  switch (entity.kind) {
    case 'note': {
      const n = noteStore.getById(entity.id);
      label = n ? n.title || entity.id : entity.id;
      break;
    }
    case 'module': {
      const m = moduleStore.items.find((m) => m.id === entity.id);
      label = m ? m.name || m.id : entity.id;
      break;
    }
    case 'party': {
      const p = partyStore.items.find((p) => p.id === entity.id);
      label = p ? p.name || p.id : entity.id;
      break;
    }
    case 'monster': {
      const m = monsterStore.items.find((m) => m.id === entity.id);
      label = m ? m.name || m.id : entity.id;
      break;
    }
    case 'encounter': {
      const e = encounterStore.items.find((e) => e.id === entity.id);
      label = e ? e.name || e.id : entity.id;
      break;
    }
    case 'character': {
      const c = characterStore.items.find((c) => c.id === entity.id);
      label = c ? c.name || entity.id : entity.id;
      break;
    }
    case 'location': {
      const l = locationStore.items.find((l) => l.id === entity.id);
      label = l ? l.name || entity.id : entity.id;
      break;
    }
    default:
      label = entity.id;
  }
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
