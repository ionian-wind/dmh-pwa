<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import type { Monster } from '@/types';
import MonsterEditor from '@/components/MonsterEditor.vue';
import MonsterCard from '@/components/MonsterCard.vue';
import Button from '@/components/Button.vue';

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
      <Button @click="handleCreateClick">Create Monster</Button>
    </div>

    <div v-if="monsterStore.monsters.length === 0" class="empty-state">
      <p>No monsters yet. Create your first monster to get started!</p>
    </div>

    <div v-else class="monsters-grid">
      <MonsterCard
        v-for="monster in monsterStore.monsters"
        :key="monster.id"
        :monster="monster"
        :show-actions="true"
        @view="() => router.push(`/monsters/${monster.id}`)"
        @edit="handleEditClick"
        @delete="deleteMonster"
        @add-to-encounter="() => {}"
      />
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
</style> 
