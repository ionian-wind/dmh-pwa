<script setup lang="ts">
import { computed } from 'vue';
import { useModuleStore } from '@/stores/modules';
import { Monster } from '@/types';
import BaseCard from './BaseCard.vue';

const props = defineProps<{
  monster: Monster;
  showActions?: boolean;
}>();

const emit = defineEmits(['edit', 'delete', 'link-note', 'add-to-encounter']);

const moduleStore = useModuleStore();

const moduleName = computed(() => {
  return moduleStore.getModuleName?.(props.monster.moduleId) || 'Unknown Module';
});
</script>

<template>
  <BaseCard>
    <template #header>
      <div class="monster-header">
        <h3>{{ monster.name }}</h3>
        <span class="monster-type">{{ monster.type }}, CR: {{ monster.challengeRating }}</span>
      </div>
    </template>
    <div class="monster-stats">
      <div class="stat-group">
        <h4>Ability Scores</h4>
        <div class="stats-grid">
          <div class="stat-item"><span class="stat-name">STR:</span> <span class="stat-value">{{ monster.abilities.strength }}</span></div>
          <div class="stat-item"><span class="stat-name">DEX:</span> <span class="stat-value">{{ monster.abilities.dexterity }}</span></div>
          <div class="stat-item"><span class="stat-name">CON:</span> <span class="stat-value">{{ monster.abilities.constitution }}</span></div>
          <div class="stat-item"><span class="stat-name">INT:</span> <span class="stat-value">{{ monster.abilities.intelligence }}</span></div>
          <div class="stat-item"><span class="stat-name">WIS:</span> <span class="stat-value">{{ monster.abilities.wisdom }}</span></div>
          <div class="stat-item"><span class="stat-name">CHA:</span> <span class="stat-value">{{ monster.abilities.charisma }}</span></div>
        </div>
      </div>
    </div>
    <div class="monster-details">
      <div class="detail-item"><span class="detail-label">AC:</span> <span class="detail-value">{{ monster.armorClass }}</span></div>
      <div class="detail-item"><span class="detail-label">HP:</span> <span class="detail-value">{{ monster.hitPoints }}</span></div>
      <div class="detail-item"><span class="detail-label">Speed:</span> <span class="detail-value">{{ monster.speed.walk || 0 }}ft</span></div>
      <div class="detail-item"><span class="detail-label">Module:</span> <span class="detail-value">{{ moduleName }}</span></div>
    </div>
    <div class="monster-abilities" v-if="monster.specialAbilities?.length">
      <h4>Special Abilities</h4>
      <ul>
        <li v-for="(ability, idx) in monster.specialAbilities" :key="idx">{{ ability }}</li>
      </ul>
    </div>
    <template #actions v-if="showActions">
      <button @click="$emit('edit', monster)">Edit</button>
      <button @click="$emit('delete', monster.id)">Delete</button>
      <button @click="$emit('add-to-encounter', monster)">Add to Encounter</button>
    </template>
  </BaseCard>
</template>

<style scoped>
.monster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.monster-type {
  font-style: italic;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
.stat-item {
  display: flex;
  justify-content: space-between;
}
.monster-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem 0;
}
.detail-item {
  text-align: left;
}
.detail-label {
  font-size: 0.8rem;
  color: #666;
  margin-right: 0.25rem;
}
.detail-value {
  font-size: 1rem;
  font-weight: bold;
  color: #333;
}
.monster-abilities {
  margin-top: 0.5rem;
}
.monster-abilities h4 {
  margin: 0 0 0.25rem 0;
}
.monster-abilities ul {
  margin: 0;
  padding-left: 1.2em;
}
.monster-abilities li {
  font-size: 0.95em;
  color: #444;
}
.monster-actions button {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  border: none;
}
.monster-actions button {
  background: #2196f3;
  color: white;
}
.monster-actions button:hover {
  background: #1976d2;
}
</style>
