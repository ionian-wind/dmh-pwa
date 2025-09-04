<script setup lang="ts">
import { ref, computed, watch, onMounted, inject, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import type { ComponentInjection, Monster } from '@/types';
import MonsterEditor from '@/monsters/MonsterEditor.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import { useI18n } from 'vue-i18n';
import MonsterViewSidebar from '@/monsters/MonsterViewSidebar.vue';

const route = useRoute();
const router = useRouter();
const monsterStore = useMonsterStore();
const showEditor = ref(false);
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
  if (!monster.value) return;
  await monsterStore.remove(monster.value.id);
  await router.push('/monsters');
};

// Computed properties for BaseEntityView
const monsterTitle = computed(() => monster.value?.name || '');

const setRightDrawerContent = inject('setRightDrawerContent') as (
  arg: ComponentInjection,
) => void;

onMounted(async () => {
  await monsterStore.load();
  setRightDrawerContent({ component: MonsterViewSidebar, props: { monster } });
});

onBeforeUnmount(() => {
  setRightDrawerContent(null);
});
</script>

<template>
  <BaseEntityView
    :entity="monster"
    entity-name="t('monsters.title')"
    list-route="/monsters"
    :on-delete="handleDelete"
    :on-edit="handleEditClick"
    :is-editing="showEditor"
    :title="monsterTitle"
    :not-found="notFound"
    :loading="loading"
  >
    <div v-if="monster" class="q-pa-md q-gutter-md">
      <div v-if="monster.notes" class="q-mb-md">
        <h2>{{ t('notes.title') }}</h2>
        <div class="q-pa-sm bg-grey-1 rounded-borders">
          <p>{{ monster.notes }}</p>
        </div>
      </div>
    </div>

    <!-- Editor Modal -->
    <template #editor>
      <MonsterEditor
        :isOpen="showEditor"
        :monster="monster"
        @submit="handleSave"
        @cancel="handleCancel"
      />
    </template>
  </BaseEntityView>
</template>
