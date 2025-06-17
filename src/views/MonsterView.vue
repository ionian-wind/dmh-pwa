<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import type { Monster } from '@/types';
import MonsterEditor from '@/components/MonsterEditor.vue';
import Button from '@/components/Button.vue';

const route = useRoute();
const router = useRouter();
const monsterStore = useMonsterStore();
const showEditor = ref(false);

const monster = ref<Monster | null>(null);

onMounted(async () => {
  const monsterId = route.params.id as string;
  await monsterStore.loadMonsters();
  monster.value = monsterStore.monsters.find(m => m.id === monsterId) || null;
  
  if (!monster.value) {
    router.push('/monsters');
  }
});

const handleEditClick = () => {
  showEditor.value = true;
};

const handleSubmit = async (updatedMonster: Monster) => {
  await monsterStore.updateMonster(updatedMonster);
  monster.value = updatedMonster;
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteMonster = async () => {
  if (!monster.value) return;
  
  if (confirm(`Are you sure you want to delete the monster "${monster.value.name}"?`)) {
    await monsterStore.deleteMonster(monster.value.id);
    router.push('/monsters');
  }
};
</script>

<template>
  <div v-if="monster" class="monster-view">
    <div class="view-header">
      <div class="header-content">
        <h1>{{ monster.name }}</h1>
        <div class="monster-meta">
          <span class="type">{{ monster.type }}</span>
          <span class="size">{{ monster.size }}</span>
          <span class="alignment">{{ monster.alignment }}</span>
          <span class="cr">CR {{ monster.challengeRating }}</span>
        </div>
      </div>
      <div class="header-actions">
        <Button class="edit-btn" @click="handleEditClick">Edit</Button>
        <Button variant="danger" class="delete-btn" @click="deleteMonster">Delete</Button>
      </div>
    </div>

    <div class="monster-content">
      <div class="stats-section">
        <div class="stat-block">
          <div class="stat">
            <span class="label">Armor Class</span>
            <span class="value">{{ monster.armorClass }}</span>
          </div>
          <div class="stat">
            <span class="label">Hit Points</span>
            <span class="value">{{ monster.hitPoints }}</span>
          </div>
          <div class="stat">
            <span class="label">Speed</span>
            <span class="value">
              <template v-for="(value, type) in monster.speed" :key="type">
                {{ type }} {{ value }}ft.
              </template>
            </span>
          </div>
        </div>

        <div class="ability-scores">
          <div v-for="(value, ability) in monster.abilities" :key="ability" class="ability">
            <span class="ability-name">{{ ability.slice(0, 3).toUpperCase() }}</span>
            <span class="ability-score">{{ value }}</span>
            <span class="ability-modifier">{{ Math.floor((value - 10) / 2) }}</span>
          </div>
        </div>
      </div>

      <div class="details-section">
        <div v-if="monster.savingThrows && Object.keys(monster.savingThrows).length > 0" class="detail-group">
          <h3>Saving Throws</h3>
          <p>
            <template v-for="(value, ability) in monster.savingThrows" :key="ability">
              {{ ability.slice(0, 3).toUpperCase() }} +{{ value }},
            </template>
          </p>
        </div>

        <div v-if="monster.skills && Object.keys(monster.skills).length > 0" class="detail-group">
          <h3>Skills</h3>
          <p>
            <template v-for="(value, skill) in monster.skills" :key="skill">
              {{ skill }} +{{ value }},
            </template>
          </p>
        </div>

        <div v-if="monster.damageVulnerabilities?.length" class="detail-group">
          <h3>Damage Vulnerabilities</h3>
          <p>{{ monster.damageVulnerabilities.join(', ') }}</p>
        </div>

        <div v-if="monster.damageResistances?.length" class="detail-group">
          <h3>Damage Resistances</h3>
          <p>{{ monster.damageResistances.join(', ') }}</p>
        </div>

        <div v-if="monster.damageImmunities?.length" class="detail-group">
          <h3>Damage Immunities</h3>
          <p>{{ monster.damageImmunities.join(', ') }}</p>
        </div>

        <div v-if="monster.conditionImmunities?.length" class="detail-group">
          <h3>Condition Immunities</h3>
          <p>{{ monster.conditionImmunities.join(', ') }}</p>
        </div>

        <div v-if="monster.senses?.length" class="detail-group">
          <h3>Senses</h3>
          <p>{{ monster.senses.join(', ') }}</p>
        </div>

        <div v-if="monster.languages?.length" class="detail-group">
          <h3>Languages</h3>
          <p>{{ monster.languages.join(', ') }}</p>
        </div>
      </div>

      <div v-if="monster.specialAbilities?.length" class="abilities-section">
        <h2>Special Abilities</h2>
        <div v-for="ability in monster.specialAbilities" :key="ability.name" class="ability-block">
          <h3>{{ ability.name }}</h3>
          <p>{{ ability.description }}</p>
        </div>
      </div>

      <div v-if="monster.actions?.length" class="actions-section">
        <h2>Actions</h2>
        <div v-for="action in monster.actions" :key="action.name" class="action-block">
          <h3>{{ action.name }}</h3>
          <p>{{ action.description }}</p>
        </div>
      </div>

      <div v-if="monster.legendaryActions?.length" class="legendary-actions-section">
        <h2>Legendary Actions</h2>
        <div v-for="action in monster.legendaryActions" :key="action.name" class="action-block">
          <h3>{{ action.name }}</h3>
          <p>{{ action.description }}</p>
        </div>
      </div>
    </div>

    <MonsterEditor
      v-if="showEditor"
      :monster="monster"
      :is-open="showEditor"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.monster-view {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.monster-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.type,
.size,
.alignment,
.cr {
  background: var(--color-background-soft);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.edit-btn {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.delete-btn {
  background: var(--color-danger);
  color: white;
}

.edit-btn:hover {
  background: var(--color-background-mute);
}

.delete-btn:hover {
  background: var(--color-danger-dark);
}

.monster-content {
  display: grid;
  gap: 2rem;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.stat-block {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  background: var(--color-background-soft);
  padding: 1rem;
  border-radius: var(--border-radius);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat .label {
  font-size: 0.8rem;
  color: var(--color-text-light);
  margin-bottom: 0.25rem;
}

.stat .value {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--color-text);
}

.ability-scores {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  background: var(--color-background-soft);
  padding: 1rem;
  border-radius: var(--border-radius);
}

.ability {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.ability-name {
  font-size: 0.8rem;
  color: var(--color-text-light);
  margin-bottom: 0.25rem;
}

.ability-score {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--color-text);
}

.ability-modifier {
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.details-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.detail-group {
  background: var(--color-background-soft);
  padding: 1rem;
  border-radius: var(--border-radius);
}

.detail-group h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1rem;
}

.detail-group p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.abilities-section,
.actions-section,
.legendary-actions-section {
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: var(--border-radius);
}

.abilities-section h2,
.actions-section h2,
.legendary-actions-section h2 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.ability-block,
.action-block {
  margin-bottom: 1.5rem;
}

.ability-block:last-child,
.action-block:last-child {
  margin-bottom: 0;
}

.ability-block h3,
.action-block h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1rem;
}

.ability-block p,
.action-block p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  line-height: 1.5;
}
</style>
