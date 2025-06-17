<template>
    <div class="character-view" v-if="character">
      <h1>{{ character.name }}</h1>
      <CharacterCard :character="character" @edit="editCharacter" @delete="deleteCharacter" />
      <CharacterEditor
        :isOpen="showEditor"
        :character="character"
        @submit="handleSave"
        @cancel="closeEditor"
      />
    </div>
    <div v-else class="empty-state">
      <p>Character not found.</p>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useCharacterStore } from '@/stores/characters';
  import CharacterCard from '@/components/CharacterCard.vue';
  import CharacterEditor from '@/components/CharacterEditor.vue';
  import type { PlayerCharacter } from '@/types';
  
  const route = useRoute();
  const router = useRouter();
  const characterStore = useCharacterStore();
  const showEditor = ref(false);
  const character = ref<PlayerCharacter | null>(null);
  
  onMounted(() => {
    const id = route.params.id as string;
    character.value = characterStore.getById(id);
  });
  
  function editCharacter() {
    showEditor.value = true;
  }
  
  function deleteCharacter() {
    if (character.value && confirm(`Delete character "${character.value.name}"?`)) {
      characterStore.remove(character.value.id);
      router.push('/characters');
    }
  }
  
  function handleSave(updated: PlayerCharacter) {
    if (character.value) {
      characterStore.update(character.value.id, updated);
      character.value = characterStore.getById(character.value.id);
    }
    showEditor.value = false;
  }
  
  function closeEditor() {
    showEditor.value = false;
  }
  </script>
  
  <style scoped>
  .character-view {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem;
  }
  .empty-state {
    color: #888;
    text-align: center;
    margin: 2rem 0;
  }
  </style>
  