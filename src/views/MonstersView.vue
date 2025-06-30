<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import BaseListView from '@/components/common/BaseListView.vue';
import MonsterCard from '@/components/MonsterCard.vue';
import MonsterEditor from '@/components/MonsterEditor.vue';
import type { Monster } from '@/types';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const monsterStore = useMonsterStore();
const { t } = useI18n();

const searchQuery = ref('');

onMounted(async () => {
  await monsterStore.load();
});

const cardProps = (monster: Monster) => ({
  monster,
  showView: true,
  showEdit: true,
  showDelete: true,
});

const editorProps = (monster: Monster | null) => ({
  monster,
  isEditing: !!monster,
});

async function handleDelete(monster: Monster) {
  await monsterStore.remove(monster.id);
}

async function handleSubmit(monster: Monster) {
  if (monster.id) {
    await monsterStore.update(monster.id, monster);
  } else {
    await monsterStore.create(monster);
  }
}

function handleCopy(monster: Monster) {
  // Implementation of handleCopy
}

function handleView(monster: Monster) {
  router.push(`/monsters/${monster.id}`);
}

function handleTagClick(tag: string) {
  // Implementation of handleTagClick
}

function updateSearchQuery(query: string) {
  searchQuery.value = query;
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
    @delete="handleDelete"
    @submit="handleSubmit"
    @view="handleView"
    @tag-click="handleTagClick"
    @copy="handleCopy"
    :show-search="true"
    :search-query="searchQuery"
    @update:searchQuery="updateSearchQuery"
  />
</template>
