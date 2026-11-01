<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import BaseListView from '@/components/common/BaseListView.vue';
import MonsterCard from '@/monsters/MonsterCard.vue';
import MonsterEditor from '@/monsters/MonsterEditor.vue';
import type { Monster } from '@/types';
import { useI18n } from 'vue-i18n';
import { confirm } from '@/dialogs';

const router = useRouter();
const monsterStore = useMonsterStore();
const { t } = useI18n();

onMounted(async () => {
  await monsterStore.load();
});

const cardProps = (monster: Monster) => ({
  monster,
  showActions: true,
  onView: () => handleView(monster),
  onEdit: () => handleEdit(monster),
  onDelete: () => handleDelete(monster),
});

const editorProps = (monster: Monster | null) => ({
  monster,
  isOpen: true,
});

async function handleDelete(monster: Monster) {
  if (
    monster.id &&
    (await confirm(t('common.confirmDelete', { title: monster.name })))
  ) {
    await monsterStore.remove(monster.id);
    return true;
  }
  return false;
}

async function handleSubmit(monster: Monster) {
  if (monster.id) {
    await monsterStore.update(monster.id, monster);
  } else {
    await monsterStore.create(monster);
  }
}

async function handleCopy(monster: Monster) {
  const { id, createdAt, updatedAt, ...rest } = monster;
  await monsterStore.create(rest);
}

function handleEdit(monster: Monster) {
  // handled by BaseListView
}

function handleView(monster: Monster) {
  router.push(`/monsters/${monster.id}`);
}
</script>

<template>
  <BaseListView
    :items="monsterStore.filtered"
    :card-component="MonsterCard"
    :editor-component="MonsterEditor"
    :empty-message="t('common.empty')"
    :create-title="t('monsters.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    show-search
    :search-query="monsterStore.searchQuery"
    @update:search-query="monsterStore.setSearchQuery"
    @submit="handleSubmit"
    @copy="handleCopy"
    @view="handleView"
    @delete="handleDelete"
  />
</template>
