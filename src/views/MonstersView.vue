<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import BaseListView from '@/components/common/BaseListView.vue';
import MonsterCard from '@/components/MonsterCard.vue';
import MonsterEditor from '@/components/MonsterEditor.vue';
import type { Monster } from '@/types';

const router = useRouter();
const monsterStore = useMonsterStore();

onMounted(async () => {
  await monsterStore.load();
});

function cardProps(monster: Monster) {
  return {
    monster,
    onView: () => router.push(`/monsters/${monster.id}`),
    onEdit: () => handleEdit(monster),
    onDelete: () => handleDelete(monster)
  };
}

function editorProps(monster: Monster | null) {
  return {
    monster,
    isOpen: true
  };
}

function handleEdit(monster: Monster) {
  // handled by BaseListView
}

function handleDelete(monster: Monster) {
  if (confirm('Are you sure you want to delete this monster?')) {
    monsterStore.remove(monster.id);
  }
}

async function handleCopy(monster: Monster) {
  const { id, createdAt, updatedAt, ...rest } = monster;
  await monsterStore.create(rest);
}

function handleSubmit(monster: Monster) {
  if (monster.id) {
    monsterStore.update(monster.id, monster);
  } else {
    monsterStore.create(monster);
  }
}
</script>

<template>
  <BaseListView
    :items="monsterStore.filtered"
    :card-component="MonsterCard"
    :editor-component="MonsterEditor"
    :empty-message="'No monsters found.'"
    create-title="Create Monster"
    :card-props="cardProps"
    :editor-props="editorProps"
    @delete="handleDelete"
    @submit="handleSubmit"
    @view="(monster) => router.push(`/monsters/${monster.id}`)"
    @copy="handleCopy"
  />
</template>
