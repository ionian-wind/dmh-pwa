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
  await monsterStore.load();
});

const handleCreateClick = () => {
  editingMonster.value = null;
  showEditor.value = true;
};

const handleEditClick = (monster: Monster) => {
  editingMonster.value = monster;
  showEditor.value = true;
};

const handleSave = async (monster: Monster) => {
  if (monster.id) {
    await monsterStore.update(monster.id, monster);
  } else {
    await monsterStore.create(monster);
  }
  showEditor.value = false;
  editingMonster.value = {
    id: '',
    name: '',
    type: '',
    description: '',
    size: '',
    alignment: '',
    armorClass: 0,
    hitPoints: 0,
    speed: {},
    stats: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    senses: [],
    languages: [],
    specialAbilities: [],
    challengeRating: '0',
    xp: 0,
    actions: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteMonster = async (monsterId: string) => {
  if (confirm('Are you sure you want to delete this monster?')) {
    await monsterStore.remove(monsterId);
  }
};
</script>

<template>
  <div class="view-list">
    <div class="view-header">
      <Button @click="handleCreateClick">+</Button>
    </div>

    <div v-if="monsterStore.filtered.length === 0" class="view-empty">
      <p>No monsters found.</p>
    </div>

    <div class="monsters-grid">
      <MonsterCard
        v-for="monster in monsterStore.filtered"
        :key="monster.id"
        :monster="monster"
        @view="() => router.push(`/monsters/${monster.id}`)"
        :show-actions="true"
        @edit="handleEditClick"
        @delete="deleteMonster"
      />
    </div>

    <MonsterEditor
      v-if="showEditor"
      :monster="editingMonster"
      :is-open="showEditor"
      @submit="handleSave"
      @cancel="handleCancel"
    />
  </div>
</template>
