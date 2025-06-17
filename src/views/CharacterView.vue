<template>
    <div class="character-view" v-if="character">
      <div class="character-header">
      <h1>{{ character.name }}</h1>
        <div class="character-subtitle">
          <span>{{ character.level }} {{ character.class }}</span>
          <span>{{ character.race }}</span>
          <span v-if="character.alignment">{{ character.alignment }}</span>
        </div>
        <div class="header-actions">
          <Button @click="editCharacter">Edit Character</Button>
          <Button variant="danger" @click="deleteCharacter">Delete Character</Button>
        </div>
      </div>

      <div class="character-sheet">
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
  import CharacterEditor from '@/components/CharacterEditor.vue';
  import type { PlayerCharacter } from '@/types';
  import Button from '@/components/Button.vue';
  
  const route = useRoute();
  const router = useRouter();
  const characterStore = useCharacterStore();
  const showEditor = ref(false);
  const character = ref<PlayerCharacter | null>(null);
  
  onMounted(() => {
    const id = route.params.id as string;
    character.value = characterStore.getById(id);
  });
  
  function abilityModifier(score: number) {
    return Math.floor((score - 10) / 2);
  }
  
  function formatModifier(modifier: number) {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }
  
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
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  .character-header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--color-border);
  }

  .character-header h1 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text);
    font-size: 2.5rem;
  }

  .character-subtitle {
    display: flex;
    justify-content: center;
    gap: 1rem;
    color: var(--color-text-light);
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .header-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  .edit-btn, .delete-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  .edit-btn {
    background: var(--color-primary);
    color: white;
  }

  .delete-btn {
    background: var(--color-danger);
    color: white;
  }

  .edit-btn:hover {
    background: var(--color-primary-dark);
  }

  .delete-btn:hover {
    background: var(--color-danger-dark);
  }

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

  .hit-points {
    text-align: center;
    background: var(--color-background);
    padding: 1rem;
    border-radius: var(--border-radius);
  }

  .hp-display {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .hp-current {
    color: var(--color-primary);
  }

  .hp-separator {
    color: var(--color-text-light);
  }

  .hp-maximum {
    color: var(--color-text);
  }

  .hp-temp {
    font-size: 1rem;
    color: var(--color-text-light);
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
  .equipment-list ul,
  .spells-list ul,
  .features-list ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .equipment-list li,
  .spells-list li,
  .features-list li {
    margin-bottom: 0.25rem;
    color: var(--color-text);
  }

  .empty-list {
    color: var(--color-text-light);
    font-style: italic;
  }

  /* Notes */
  .notes-content {
    color: var(--color-text);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .empty-state {
    color: #888;
    text-align: center;
    margin: 2rem 0;
  }
  </style>
  