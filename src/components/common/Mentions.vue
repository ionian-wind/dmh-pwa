<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { cropTitle } from '@/utils/cropTitle';

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

onMounted(async () => {
  await noteStore.load();
  await moduleStore.load();
  await partyStore.load();
  await monsterStore.load();
  await encounterStore.load();
});

function getEntityRoute(entity: EntityRef) {
  switch (entity.kind) {
    case 'monster': return `/monsters/${entity.id}`;
    case 'party': return `/parties/${entity.id}`;
    case 'encounter': return `/encounters/${entity.id}`;
    case 'module': return `/modules/${entity.id}`;
    case 'note': return `/notes/${entity.id}`;
    default: return '#';
  }
}

function getEntityLabel(entity: EntityRef) {
  return entity.kind.charAt(0).toUpperCase() + entity.kind.slice(1);
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
      const m = moduleStore.items.find(m => m.id === entity.id);
      label = m ? m.name || m.id : entity.id;
      break;
    }
    case 'party': {
      const p = partyStore.items.find(p => p.id === entity.id);
      label = p ? p.name || p.id : entity.id;
      break;
    }
    case 'monster': {
      const m = monsterStore.items.find(m => m.id === entity.id);
      label = m ? m.name || m.id : entity.id;
      break;
    }
    case 'encounter': {
      const e = encounterStore.items.find(e => e.id === entity.id);
      label = e ? e.name || e.id : entity.id;
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
  <div class="mentions-aside">
    <h3 class="mentions-title">{{ $t(title) }}</h3>
    <template v-if="entities.length">
      <div v-for="(group, kind) in groupedEntities" :key="kind" class="mentions-group">
        <h4 class="mentions-group-title">{{ getEntityLabel({ kind, id: '' }) }}<span v-if="group.length > 1">s</span></h4>
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
      <div class="mentions-empty">No mentions exist.</div>
    </template>
  </div>
</template>

<style scoped>

.mentions-group {
  margin-bottom: 1em;
}

.mentions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.mentions-list li {
  margin-bottom: 0.5em;
}
.mentions-empty {
  color: var(--color-text-light);
  font-style: italic;
  text-align: center;
  padding: 0.5rem 0;
}
</style> 
