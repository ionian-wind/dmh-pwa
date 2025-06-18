<script setup lang="ts">
import { computed } from 'vue';
import { useModuleStore } from '@/stores/modules';
import { Monster } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';;

const props = defineProps<{
  monster: Monster;
  showActions?: boolean;
}>();

const emit = defineEmits(['view', 'edit', 'delete', 'add-to-encounter']);

const abilityModifier = (score: number) => {
  return Math.floor((score - 10) / 2);
};

const formatModifier = (modifier: number) => {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

const stats = computed(() => [
  { name: 'STR', value: props.monster.stats.strength },
  { name: 'DEX', value: props.monster.stats.dexterity },
  { name: 'CON', value: props.monster.stats.constitution },
  { name: 'INT', value: props.monster.stats.intelligence },
  { name: 'WIS', value: props.monster.stats.wisdom },
  { name: 'CHA', value: props.monster.stats.charisma }
]);

const handleView = () => emit('view', props.monster);
const handleEdit = () => emit('edit', props.monster);
const handleDelete = () => emit('delete', props.monster.id);
</script>

<template>
  <BaseCard
    :show-view="showActions"
    :show-edit="showActions"
    :show-delete="showActions"
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
  >
    <template #header>
      <div class="monster-header">
        <h3>{{ monster.name }}</h3>
        <div class="monster-subtitle">
          <span>{{ monster.type }}, CR {{ monster.challengeRating }}</span>
          <span>{{ monster.size }} {{ monster.alignment }}</span>
        </div>
      </div>
    </template>
    <div class="monster-stats">
      <div v-for="stat in stats" :key="stat.name" class="stat-block">
        <div class="stat-name">{{ stat.name }}</div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-modifier">{{ formatModifier(abilityModifier(stat.value)) }}</div>
      </div>
    </div>
    <div class="monster-details">
      <div class="detail-item">
        <span class="detail-label">HP:</span>
        <span class="detail-value">{{ monster.hitPoints }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">AC:</span>
        <span class="detail-value">{{ monster.armorClass }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Speed:</span>
        <span class="detail-value">{{ monster.speed.walk || 0 }}ft</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">XP:</span>
        <span class="detail-value">{{ monster.xp }}</span>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.monster-header {
  margin-bottom: 0.5rem;
}
.monster-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}
.monster-subtitle {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}
.monster-stats {
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
.monster-details {
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
</style>
