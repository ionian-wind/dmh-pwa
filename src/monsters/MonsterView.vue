<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import type { Monster } from '@/types';
import MonsterEditor from '@/monsters/MonsterEditor.vue';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import { useEntityViewTabs } from '@/components/common/entityViewTabs';
import type { MapEntityRef } from '@/maps/types';
import { useI18n } from 'vue-i18n';
import MonsterViewSidebar from '@/monsters/MonsterViewSidebar.vue';
import { confirm } from '@/dialogs';
import { useRightDrawer } from '@/composables/useLayout';

const route = useRoute();
const router = useRouter();
const monsterStore = useMonsterStore();
const showEditor = ref(false);
const activeTab = ref('main');
const tabs = useEntityViewTabs();
const { t } = useI18n();

const monster = ref<Monster | null>(null);
const loading = computed(() => !monsterStore.isLoaded);
const notFound = computed(() => monsterStore.isLoaded && !monster.value);

function updateMonsterFromStore() {
  if (!monsterStore.isLoaded) {
    return;
  }
  const found = monsterStore.getById(route.params.id as string);
  if (found) {
    monster.value = found;
  } else {
    router.push('/monsters');
  }
}

watch(
  [() => monsterStore.items, () => monsterStore.isLoaded],
  updateMonsterFromStore,
  { immediate: true },
);

const handleEditClick = () => {
  showEditor.value = true;
};

const handleSave = async (updatedMonster: Monster) => {
  if (!monster.value) return;
  await monsterStore.update(monster.value.id, updatedMonster);
  showEditor.value = false;
  updateMonsterFromStore();
};

const handleCancel = () => {
  showEditor.value = false;
};

const handleDelete = async () => {
  if (!monster.value) return false;
  if (
    !(await confirm(t('common.confirmDelete', { title: monster.value.name })))
  ) {
    return false;
  }
  await monsterStore.remove(monster.value.id);
  return true;
};

// Computed properties for BaseEntityView
const monsterTitle = computed(() => monster.value?.name || '');
const monsterLinks = computed<MapEntityRef[]>(() =>
  (monster.value?.moduleIds ?? []).map((id) => ({ kind: 'module', id })),
);

const rightDrawer = useRightDrawer();

onMounted(async () => {
  await monsterStore.load();
  rightDrawer.set({ component: MonsterViewSidebar, props: { monster } });
});

onBeforeUnmount(() => {
  rightDrawer.clear();
});

async function handleEditorDelete() {
  if (await handleDelete()) {
    showEditor.value = false;
    await router.push('/monsters');
  }
}
</script>

<template>
  <BaseEntityTabView
    :entity="monster"
    entity-name="t('monsters.title')"
    list-route="/monsters"
    :on-delete="handleDelete"
    :on-edit="handleEditClick"
    :is-editing="showEditor"
    :title="monsterTitle"
    :not-found="notFound"
    :loading="loading"
    :tabs="tabs"
    v-model="activeTab"
  >
    <template #main>
      <div v-if="monster" class="q-pa-md q-gutter-md">
        <div v-if="monster.notes" class="q-mb-md">
          <h2>{{ t('notes.title') }}</h2>
          <div class="q-pa-sm bg-grey-1 rounded-borders">
            <p>{{ monster.notes }}</p>
          </div>
        </div>
      </div>
    </template>

    <template #links>
      <EntityViewLinks :links="monsterLinks" />
    </template>

    <!-- Editor Modal -->
    <template #editor>
      <MonsterEditor
        :isOpen="showEditor"
        :monster="monster"
        @submit="handleSave"
        @delete="handleEditorDelete"
        @cancel="handleCancel"
      />
    </template>
  </BaseEntityTabView>
</template>
