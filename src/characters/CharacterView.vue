<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCharacterStore } from '@/stores/characters';
import CharacterEditor from '@/characters/CharacterEditor.vue';
import type { PlayerCharacter } from '@/types';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/utils/storage';
import { useI18n } from 'vue-i18n';

const router = useRouter();

const route = useRoute();
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
  if (character.value) {
    await characterStore.remove(character.value.id);
    await router.push('/characters');
  }
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

const mentionedEntities = computed(() => {
  if (!character.value) return [];
  return mentionsStore.getLinks({ kind: 'character', id: character.value.id });
});
const mentionedInEntities = computed(() => {
  if (!character.value) return [];
  return mentionsStore.getBacklinks({
    kind: 'character',
    id: character.value.id,
  });
});

onMounted(async () => {
  await characterStore.load();
  await mentionsStore.load();
});
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
        @cancel="closeEditor"
      />
    </template>

    <template #sidepanel>
      <Mentions :title="t('common.mentions')" :entities="mentionedEntities" />
      <Mentions
        :title="t('common.mentionedIn')"
        :entities="mentionedInEntities"
      />
    </template>
  </BaseEntityView>
</template>

<style scoped>
/* Removed custom layout classes. Use Quasar classes. */
</style>
