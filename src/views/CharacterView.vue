<template>
  <div class="character-view-container" style="display: flex; flex-direction: row; gap: 2rem; align-items: flex-start;">
    <div style="flex: 2 1 0; min-width: 0;">
      <div v-if="loading" class="loading-state">Loading...</div>
      <NotFoundView v-else-if="notFound" />
      <BaseEntityView
        v-else
        :entity="character"
        entity-name="Character"
        list-route="/characters"
        :on-delete="handleDelete"
        :on-edit="editCharacter"
        :is-editing="showEditor"
        :title="characterTitle"
        :subtitle="characterSubtitle"
        :not-found="notFound"
      >
        <!-- Character Content -->
        <div v-if="character" class="character-sheet">
          <!-- Player Information -->
          <section class="sheet-section player-info">
            <h2>Player Name</h2>
            <div class="info-grid">
              <div class="info-item">
                <span>{{ character.playerName || 'N/A' }}</span>
              </div>
            </div>
          </section>

          <!-- Basic Information -->
          <section class="sheet-section basic-info">
            <h2>Basic Information</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Background:</label>
                <span>{{ character.background || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Experience Points:</label>
                <span>{{ (character.level - 1) * 300 }} XP</span>
              </div>
            </div>
          </section>

          <!-- Ability Scores -->
          <section class="sheet-section ability-scores">
            <h2>Ability Scores</h2>
            <div class="ability-grid">
              <div v-for="(score, ability) in character.stats" :key="ability" class="ability-score">
                <div class="ability-name">{{ ability.charAt(0).toUpperCase() + ability.slice(1) }}</div>
                <div class="ability-value">{{ score }}</div>
                <div class="ability-modifier">{{ formatModifier(abilityModifier(score)) }}</div>
              </div>
            </div>
          </section>

          <!-- Combat -->
          <section class="sheet-section combat">
            <h2>Combat</h2>
            <div class="combat-grid">
              <div class="combat-stat">
                <label>Armor Class:</label>
                <span class="stat-value">{{ character.armorClass }}</span>
              </div>
              <div class="combat-stat">
                <label>Initiative:</label>
                <span class="stat-value">{{ formatModifier(abilityModifier(character.stats.dexterity)) }}</span>
              </div>
              <div class="combat-stat">
                <label>Speed:</label>
                <span class="stat-value">{{ character.speed }} ft</span>
              </div>
            </div>
            <div class="hit-points">
              <h3>Hit Points</h3>
              <div class="hp-display">
                <div class="hp-current">{{ character.hitPoints.current }}</div>
                <div class="hp-separator">/</div>
                <div class="hp-maximum">{{ character.hitPoints.maximum }}</div>
                <div v-if="character.hitPoints.temporary" class="hp-temp">+{{ character.hitPoints.temporary }} temp</div>
              </div>
            </div>
          </section>

          <!-- Skills & Proficiencies -->
          <section class="sheet-section skills">
            <h2>Skills & Proficiencies</h2>
            <div v-if="character.proficiencies?.length" class="proficiencies">
              <h3>Proficiencies</h3>
              <div class="proficiency-list">
                <span v-for="prof in character.proficiencies" :key="prof" class="proficiency-tag">{{ prof }}</span>
              </div>
            </div>
          </section>

          <!-- Equipment -->
          <section class="sheet-section equipment">
            <h2>Equipment</h2>
            <div v-if="character.equipment?.length" class="equipment-list">
              <ul>
                <li v-for="item in character.equipment" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div v-else class="empty-list">No equipment listed</div>
          </section>

          <!-- Spells -->
          <section v-if="character.spells?.length" class="sheet-section spells">
            <h2>Spells</h2>
            <div class="spells-list">
              <ul>
                <li v-for="spell in character.spells" :key="spell">{{ spell }}</li>
              </ul>
            </div>
          </section>

          <!-- Features -->
          <section v-if="character.features?.length" class="sheet-section features">
            <h2>Features & Traits</h2>
            <div class="features-list">
              <ul>
                <li v-for="feature in character.features" :key="feature">{{ feature }}</li>
              </ul>
            </div>
          </section>

          <!-- Notes -->
          <section v-if="character.notes" class="sheet-section notes">
            <h2>Notes</h2>
            <div class="notes-content">
              <p>{{ character.notes }}</p>
            </div>
          </section>
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
      </BaseEntityView>
    </div>
    <aside v-if="!notFound && !loading" style="flex: 1 1 250px; min-width: 200px; max-width: 320px; display: flex; flex-direction: column; gap: 2rem;">
      <Mentions title="Mentions" :entities="mentionedEntities" />
      <Mentions title="Mentioned In" :entities="mentionedInEntities" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useCharacterStore } from '@/stores/characters';
import CharacterEditor from '@/components/CharacterEditor.vue';
import type { PlayerCharacter } from '@/types';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/stores/createIndexationStore';
import NotFoundView from './NotFoundView.vue';

const route = useRoute();
const characterStore = useCharacterStore();
const showEditor = ref(false);

const mentionsStore = useMentionsStore();

const isLoaded = computed(() => characterStore.isLoaded);
const character = computed(() => characterStore.getById(route.params.id as string));
const loading = computed(() => !isLoaded.value);
const notFound = computed(() => isLoaded.value && !character.value);

function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function formatModifier(modifier: number) {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

function editCharacter() {
  showEditor.value = true;
}

function handleDelete() {
  if (!character.value) return Promise.resolve();
  characterStore.remove(character.value.id);
  return Promise.resolve();
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
const characterSubtitle = computed(() => {
  if (!character.value) return '';
  
  const parts = [
    `Level ${character.value.level} ${character.value.class}`,
    character.value.race,
    character.value.alignment
  ].filter(Boolean);
  
  return parts.join(' • ');
});

const mentionedEntities = computed(() => {
  if (!character.value) return [];
  return mentionsStore.getLinks({ kind: 'character', id: character.value.id });
});
const mentionedInEntities = computed(() => {
  if (!character.value) return [];
  return mentionsStore.getBacklinks({ kind: 'character', id: character.value.id });
});

onMounted(async () => {
  characterStore.load();
});
</script>

<style scoped>
.character-sheet {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.sheet-section {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.sheet-section h2 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.3rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.sheet-section h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1.1rem;
}

/* Basic Information */
.info-grid {
  display: grid;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item label {
  font-weight: 500;
  color: var(--color-text);
}

.info-item span {
  color: var(--color-text-light);
}

/* Ability Scores */
.ability-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.ability-score {
  text-align: center;
  background: var(--color-background);
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.ability-name {
  font-size: 0.9rem;
  color: var(--color-text-light);
  margin-bottom: 0.25rem;
}

.ability-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.ability-modifier {
  font-size: 1rem;
  color: var(--color-text-light);
}

/* Combat */
.combat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.combat-stat {
  text-align: center;
  background: var(--color-background);
  padding: 0.75rem;
  border-radius: var(--border-radius);
}

.combat-stat label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-light);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--color-text);
}

/* Hit Points */
.hit-points {
  background: var(--color-background);
  padding: 1rem;
  border-radius: var(--border-radius);
  text-align: center;
}

.hp-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.hp-current {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-success);
}

.hp-separator {
  font-size: 1.5rem;
  color: var(--color-text-light);
}

.hp-maximum {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-text);
}

.hp-temp {
  font-size: 1rem;
  color: var(--color-warning);
  margin-left: 0.5rem;
}

/* Skills & Proficiencies */
.proficiency-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.proficiency-tag {
  background: var(--color-primary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
}

/* Equipment, Spells, Features */
.equipment-list,
.spells-list,
.features-list {
  color: var(--color-text);
}

.equipment-list ul,
.spells-list ul,
.features-list ul {
  margin: 0;
  padding-left: 1.5rem;
}

.equipment-list li,
.spells-list li,
.features-list li {
  margin: 0.5rem 0;
  line-height: 1.4;
}

.empty-list {
  color: var(--color-text-light);
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

/* Notes */
.notes-content {
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
  
