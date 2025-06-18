<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import type { Monster } from '@/types';
import MonsterEditor from '@/components/MonsterEditor.vue';
import MonsterCard from '@/components/MonsterCard.vue';
import Button from '@/components/common/Button.vue';

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

const deleteMonster = async (monsterId: string) => {
  const monster = monsterStore.getMonsterById(monsterId);
  if (monster && confirm(`Are you sure you want to delete the monster "${monster.name}"?`)) {
    await monsterStore.deleteMonster(monsterId);
  }
};
</script>

<template>
  <div class="view-list">
    <div class="view-header">
      <Button @click="handleCreateClick">+</Button>
    </div>

    <div v-if="monsterStore.filteredMonsters.length === 0" class="view-empty">
      <p>No monsters yet. Create your first monster to get started!</p>
    </div>

    <div v-else class="view-grid">
      <MonsterCard
        v-for="monster in monsterStore.filteredMonsters"
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
