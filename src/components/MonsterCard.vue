<script setup lang="ts">
import { computed } from 'vue';
import { useModuleStore } from '@/stores/modules';
import { useNoteStore } from '@/stores/notes';
import { Monster, MonsterStat } from '@/types';

const props = defineProps<{
  monster: Monster;
  showActions?: boolean;
}>();

const emit = defineEmits(['edit', 'delete', 'link-note', 'add-to-encounter']);

const moduleStore = useModuleStore();
const noteStore = useNoteStore();

const modules = computed(() => {
  return moduleStore.modules.filter(m =>
    props.monster.moduleIds.includes(m.id)
  );
});

const notes = computed(() => {
  return noteStore.notes.filter(note =>
    props.monster.noteIds.includes(note.id)
  );
});

const statGroups = computed(() => {
  const groups: Record<string, MonsterStat[]> = {};
  Object.keys(props.monster.abilities).forEach(stat => {
    const groupName = stat.split(' ')[0]; // Группируем по первому слову
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(stat);
  });
  return groups;
});
</script>

<template>
  <div class="monster-card">
    <div class="monster-header">
      <h3>{{ monster.name }}</h3>
      <span class="monster-type">{{ monster.type }}, CR: {{ monster.challengeRating }}</span>
    </div>

    <div class="monster-stats">
      <div v-for="(stats, groupName) in statGroups" :key="groupName" class="stat-group">
        <h4>{{ groupName }}</h4>
        <div class="stats-grid">
          <div v-for="stat in stats" :key="stat.name" class="stat-item">
            <span class="stat-name">{{ stat.name }}:</span>
            <span class="stat-value">{{ stat.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="monster-abilities" v-if="monster.abilities">
      <h4>Abilities</h4>
      <p>{{ monster.abilities }}</p>
    </div>

    <div class="monster-links">
      <div v-if="modules.length">
        <h5>Appears in:</h5>
        <ul>
          <li v-for="module in modules" :key="module.id">
            <router-link :to="`/module/${module.id}`">{{ module.title }}</router-link>
          </li>
        </ul>
      </div>

      <div v-if="notes.length">
        <h5>Related notes:</h5>
        <ul>
          <li v-for="note in notes" :key="note.id">
            <router-link :to="`/note/${note.id}`">{{ note.title }}</router-link>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="showActions" class="monster-actions">
      <button @click="$emit('edit', monster)">Edit</button>
      <button @click="$emit('delete', monster.id)">Delete</button>
      <button @click="$emit('link-note', monster)">Link Note</button>
      <button @click="$emit('add-to-encounter', monster)">Add to Encounter</button>
    </div>
  </div>
</template>

<style scoped>
.monster-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.monster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.monster-type {
  font-style: italic;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
}

.monster-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
