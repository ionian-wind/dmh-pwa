<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCharacterStore } from '@/stores/characters';
import CharacterEditor from '@/characters/CharacterEditor.vue';
import type { PlayerCharacter } from '@/types';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import CharacterViewSidebar from '@/characters/CharacterViewSidebar.vue';
import { useMentionsStore } from '@/utils/storage';
import { useRightDrawer } from '@/composables/useLayout';
import { useI18n } from 'vue-i18n';
import { confirm } from '@/dialogs';

const route = useRoute();
const router = useRouter();
const characterStore = useCharacterStore();
const mentionsStore = useMentionsStore();
const { t } = useI18n();
const showEditor = ref(false);

const isLoaded = computed(() => characterStore.isLoaded);
const character = computed(() =>
  characterStore.getById(route.params.id as string),
);
const loading = computed(() => !isLoaded.value);
const notFound = computed(() => isLoaded.value && !character.value);

function editCharacter() {
  showEditor.value = true;
}

async function handleDelete() {
  if (
    character.value &&
    (await confirm(t('common.confirmDelete', { title: character.value.name })))
  ) {
    await characterStore.remove(character.value.id);
    return true;
  }
  return false;
}

function handleSave(updated: PlayerCharacter) {
  if (character.value) {
    characterStore.update(character.value.id, updated);
    characterStore.getById(character.value.id);
  }
  showEditor.value = false;
}

function closeEditor() {
  showEditor.value = false;
}

// Computed properties for BaseEntityView
const characterTitle = computed(() => character.value?.name || '');

const rightDrawer = useRightDrawer();

onMounted(async () => {
  await characterStore.load();
  await mentionsStore.load();
  rightDrawer.set({
    component: CharacterViewSidebar,
    props: { character },
  });
});

onBeforeUnmount(() => {
  rightDrawer.clear();
});

async function handleEditorDelete() {
  if (await handleDelete()) {
    showEditor.value = false;
    await router.push('/characters');
  }
}
</script>

<template>
  <BaseEntityView
    :entity="character"
    entity-name="t('characters.title')"
    list-route="/characters"
    :on-delete="handleDelete"
    :on-edit="editCharacter"
    :is-editing="showEditor"
    :title="characterTitle"
    :not-found="notFound"
    :loading="loading"
  >
    <div v-if="character" class="q-pa-md q-gutter-md">
      <div v-if="character.notes" class="q-mb-md">
        <h2>{{ t('notes.title') }}</h2>
        <div class="q-pa-sm bg-grey-1 rounded-borders">
          <p>{{ character.notes }}</p>
        </div>
      </div>
    </div>

    <!-- Editor Modal -->
    <template #editor>
      <CharacterEditor
        :isOpen="showEditor"
        :character="character"
        @submit="handleSave"
        @delete="handleEditorDelete"
        @cancel="closeEditor"
      />
    </template>
  </BaseEntityView>
</template>

<style scoped>
/* Removed custom layout classes. Use Quasar classes. */
</style>
