<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import type { Monster } from '@/types';
import MonsterEditor from '@/components/MonsterEditor.vue';

const router = useRouter();
const monsterStore = useMonsterStore();
const showEditor = ref(false);
const editingMonster = ref<Monster | null>(null);

onMounted(async () => {
  await monsterStore.loadMonsters();
});

const handleCreateClick = () => {
  editingMonster.value = null;
  showEditor.value = true;
};

const handleEditClick = (monster: Monster) => {
  editingMonster.value = monster;
  showEditor.value = true;
};

const handleSubmit = async (monster: Monster) => {
  if (monster.id) {
    await monsterStore.updateMonster(monster.id, monster);
  } else {
    await monsterStore.createMonster(monster);
  }
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteMonster = async (monster: Monster) => {
  if (confirm(`Are you sure you want to delete the monster "${monster.name}"?`)) {
    await monsterStore.deleteMonster(monster.id);
  }
};
</script>

<template>
  <div class="monsters-view">
    <div class="view-header">
      <h1>Monsters</h1>
      <button @click="handleCreateClick" class="create-btn">Create Monster</button>
    </div>

    <div v-if="monsterStore.monsters.length === 0" class="empty-state">
      <p>No monsters yet. Create your first monster to get started!</p>
    </div>

    <div v-else class="monsters-grid">
      <div v-for="monster in monsterStore.monsters" :key="monster.id" class="monster-card">
        <div class="card-content">
          <h2>{{ monster.name }}</h2>
          <div class="monster-meta">
            <span class="type">{{ monster.type }}</span>
            <span class="size">{{ monster.size }}</span>
            <span class="cr">CR {{ monster.challengeRating }}</span>
          </div>
          <div class="monster-stats">
            <div class="stat">
              <span class="label">AC</span>
              <span class="value">{{ monster.armorClass }}</span>
            </div>
            <div class="stat">
              <span class="label">HP</span>
              <span class="value">{{ monster.hitPoints }}</span>
            </div>
          </div>
        </div>
        <div class="card-actions">
          <button @click="() => router.push(`/monsters/${monster.id}`)" class="view-btn">View Details</button>
          <button @click="() => handleEditClick(monster)" class="edit-btn">Edit</button>
          <button @click="() => deleteMonster(monster)" class="delete-btn">Delete</button>
        </div>
      </div>
    </div>

    <MonsterEditor
      v-if="showEditor"
      :monster="editingMonster"
      :is-open="showEditor"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.monsters-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.view-header h1 {
  margin: 0;
  color: var(--color-text);
}

.create-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.create-btn:hover {
  background: var(--color-primary-dark);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  color: var(--color-text-light);
}

.monsters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.monster-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  overflow: hidden;
  transition: transform 0.2s;
}

.monster-card:hover {
  transform: translateY(-2px);
}

.card-content {
  padding: 1.5rem;
}

.card-content h2 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.monster-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.type,
.size,
.cr {
  background: var(--color-background);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
}

.monster-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-background);
  padding: 0.5rem;
  border-radius: var(--border-radius);
  min-width: 60px;
}

.stat .label {
  font-size: 0.8rem;
  color: var(--color-text-light);
}

.stat .value {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--color-text);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
}

.view-btn,
.edit-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.view-btn {
  background: var(--color-primary);
  color: white;
}

.edit-btn {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.delete-btn {
  background: var(--color-danger);
  color: white;
}

.view-btn:hover {
  background: var(--color-primary-dark);
}

.edit-btn:hover {
  background: var(--color-background-mute);
}

.delete-btn:hover {
  background: var(--color-danger-dark);
}
</style> 
