<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerCharacter } from '@/types';
import BaseCard from './BaseCard.vue';

const props = defineProps<{
  character: PlayerCharacter;
}>();

const emit = defineEmits<{
  (e: 'view', character: PlayerCharacter): void;
  (e: 'edit', character: PlayerCharacter): void;
  (e: 'delete', character: PlayerCharacter): void;
}>();

const abilityModifier = (score: number) => {
  return Math.floor((score - 10) / 2);
};

const formatModifier = (modifier: number) => {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

const stats = computed(() => [
  { name: 'STR', value: props.character.stats.strength },
  { name: 'DEX', value: props.character.stats.dexterity },
  { name: 'CON', value: props.character.stats.constitution },
  { name: 'INT', value: props.character.stats.intelligence },
  { name: 'WIS', value: props.character.stats.wisdom },
  { name: 'CHA', value: props.character.stats.charisma }
]);

function handleView() { emit('view', props.character); }
function handleEdit() { emit('edit', props.character); }
function handleDelete() { emit('delete', props.character); }
</script>

<template>
  <BaseCard showView showEdit showDelete @view="handleView" @edit="handleEdit" @delete="handleDelete">
    <template #header>
      <div class="character-header">
        <h3>{{ character.name }}</h3>
        <div class="character-subtitle">
          <span>{{ character.level }} {{ character.class }}</span>
          <span>{{ character.race }}</span>
        </div>
      </div>
    </template>
    <div class="character-stats">
      <div v-for="stat in stats" :key="stat.name" class="stat-block">
        <div class="stat-name">{{ stat.name }}</div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-modifier">{{ formatModifier(abilityModifier(stat.value)) }}</div>
      </div>
    </div>
    <div class="character-details">
      <div class="detail-item">
        <span class="detail-label">HP:</span>
        <span class="detail-value">
          {{ character.hitPoints.current }}/{{ character.hitPoints.maximum }}
          <span v-if="character.hitPoints.temporary" class="temp-hp">+{{ character.hitPoints.temporary }} temp</span>
        </span>
      </div>
      <div class="detail-item">
        <span class="detail-label">AC:</span>
        <span class="detail-value">{{ character.armorClass }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Speed:</span>
        <span class="detail-value">{{ character.speed }}ft</span>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.character-header {
  margin-bottom: 0.5rem;
}
.character-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}
.character-subtitle {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}
.character-stats {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
}
.stat-block {
  text-align: center;
}
.stat-name {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.25rem;
}
.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
}
.stat-modifier {
  font-size: 0.8rem;
  color: #666;
}
.character-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}
.detail-item {
  text-align: center;
}
.detail-label {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.25rem;
}
.detail-value {
  font-size: 1rem;
  font-weight: bold;
  color: #333;
}
.temp-hp {
  font-size: 0.8rem;
  color: #666;
  font-weight: normal;
  margin-left: 0.25rem;
}
</style>
