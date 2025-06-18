<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import type { Monster } from '@/types';
import MonsterEditor from '@/components/MonsterEditor.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/stores/createIndexationStore';

const route = useRoute();
const monsterStore = useMonsterStore();
const showEditor = ref(false);
const monster = ref<Monster | null>(null);
const notFound = ref(false);

// Monster mention indexation store
const mentionsStore = useMentionsStore();

onMounted(async () => {
  const monsterId = route.params.id as string;
  await monsterStore.loadMonsters();
  monster.value = monsterStore.monsters.find(m => m.id === monsterId) || null;
  
  if (!monster.value) {
    notFound.value = true;
  }
});

function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function formatModifier(modifier: number) {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

const handleEditClick = () => {
  showEditor.value = true;
};

const handleSubmit = async (updatedMonster: Monster) => {
  if (monster.value) {
    await monsterStore.updateMonster(monster.value.id, updatedMonster);
    monster.value = monsterStore.monsters.find(m => m.id === monster.value!.id) || null;
  }
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const handleDelete = async () => {
  if (!monster.value) return;
  await monsterStore.deleteMonster(monster.value.id);
};

// Computed properties for BaseEntityView
const monsterTitle = computed(() => monster.value?.name || '');
const monsterSubtitle = computed(() => {
  if (!monster.value) return '';
  
  const parts = [
    monster.value.type,
    monster.value.size,
    monster.value.alignment,
    `CR ${monster.value.challengeRating}`
  ].filter(Boolean);
  
  return parts.join(' • ');
});

const mentions = computed(() => {
  if (!monster.value) return [];
  return mentionsStore.getLinks({ kind: 'monster', id: monster.value.id });
});
const mentionedInEntities = computed(() => {
  if (!monster.value) return [];
  return mentionsStore.getBacklinks({ kind: 'monster', id: monster.value.id });
});
</script>

<template>
  <div class="monster-view-container" style="display: flex; flex-direction: row; gap: 2rem; align-items: flex-start;">
    <div style="flex: 2 1 0; min-width: 0;">
      <BaseEntityView
        :entity="monster"
        entity-name="Monster"
        list-route="/monsters"
        :on-delete="handleDelete"
        :on-edit="handleEditClick"
        :is-editing="showEditor"
        :title="monsterTitle"
        :subtitle="monsterSubtitle"
        :not-found="notFound"
      >
        <!-- Monster Content -->
        <div v-if="monster" class="monster-sheet">
          <!-- Basic Information -->
          <section class="sheet-section basic-info">
            <h2>Basic Information</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Type:</label>
                <span>{{ monster.type }}</span>
              </div>
              <div class="info-item">
                <label>Size:</label>
                <span>{{ monster.size }}</span>
              </div>
              <div class="info-item">
                <label>Alignment:</label>
                <span>{{ monster.alignment || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Challenge Rating:</label>
                <span>{{ monster.challengeRating }}</span>
              </div>
            </div>
          </section>

          <!-- Ability Scores -->
          <section class="sheet-section ability-scores">
            <h2>Ability Scores</h2>
            <div class="ability-grid">
              <div v-for="(score, ability) in monster.stats" :key="ability" class="ability-score">
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
                <span class="stat-value">{{ monster.armorClass }}</span>
              </div>
              <div class="combat-stat">
                <label>Hit Points:</label>
                <span class="stat-value">{{ monster.hitPoints }}</span>
              </div>
              <div class="combat-stat">
                <label>Speed:</label>
                <span class="stat-value">
                  <template v-for="(value, type) in monster.speed" :key="type">
                    {{ type }} {{ value }}ft
                  </template>
                </span>
              </div>
            </div>
          </section>

          <!-- Saving Throws & Skills -->
          <section v-if="monster.savingThrows && Object.keys(monster.savingThrows).length > 0" class="sheet-section saving-throws">
            <h2>Saving Throws</h2>
            <div class="proficiency-list">
              <span v-for="(value, ability) in monster.savingThrows" :key="ability" class="proficiency-tag">
                {{ ability.charAt(0).toUpperCase() + ability.slice(1) }} +{{ value }}
              </span>
            </div>
          </section>

          <section v-if="monster.skills && Object.keys(monster.skills).length > 0" class="sheet-section skills">
            <h2>Skills</h2>
            <div class="proficiency-list">
              <span v-for="(value, skill) in monster.skills" :key="skill" class="proficiency-tag">
                {{ skill }} +{{ value }}
              </span>
            </div>
          </section>

          <!-- Damage & Condition Info -->
          <section v-if="monster.damageVulnerabilities?.length || monster.damageResistances?.length || monster.damageImmunities?.length || monster.conditionImmunities?.length" class="sheet-section resistances">
            <h2>Damage & Conditions</h2>
            <div class="info-grid">
              <div v-if="monster.damageVulnerabilities?.length" class="info-item">
                <label>Damage Vulnerabilities:</label>
                <span>{{ monster.damageVulnerabilities.join(', ') }}</span>
              </div>
              <div v-if="monster.damageResistances?.length" class="info-item">
                <label>Damage Resistant:</label>
                <span>{{ monster.damageResistances.join(', ') }}</span>
              </div>
              <div v-if="monster.damageImmunities?.length" class="info-item">
                <label>Damage Immunities:</label>
                <span>{{ monster.damageImmunities.join(', ') }}</span>
              </div>
              <div v-if="monster.conditionImmunities?.length" class="info-item">
                <label>Condition Immunities:</label>
                <span>{{ monster.conditionImmunities.join(', ') }}</span>
              </div>
            </div>
          </section>

          <!-- Senses & Languages -->
          <section class="sheet-section senses">
            <h2>Senses & Languages</h2>
            <div class="info-grid">
              <div v-if="monster.senses?.length" class="info-item">
                <label>Senses:</label>
                <span>{{ monster.senses.join(', ') }}</span>
              </div>
              <div v-if="monster.languages?.length" class="info-item">
                <label>Languages:</label>
                <span>{{ monster.languages.join(', ') }}</span>
              </div>
            </div>
          </section>

          <!-- Special Abilities -->
          <section v-if="monster.specialAbilities?.length" class="sheet-section abilities">
            <h2>Special Abilities</h2>
            <div class="ability-list">
              <div v-for="ability in monster.specialAbilities" :key="ability" class="ability-item">
                <p>{{ ability }}</p>
              </div>
            </div>
          </section>

          <!-- Actions -->
          <section v-if="monster.actions?.length" class="sheet-section actions">
            <h2>Actions</h2>
            <div class="action-list">
              <div v-for="action in monster.actions" :key="action" class="action-item">
                <p>{{ action }}</p>
              </div>
            </div>
          </section>

          <!-- Legendary Actions -->
          <section v-if="monster.legendaryActions?.length" class="sheet-section legendary-actions">
            <h2>Legendary Actions</h2>
            <div class="action-list">
              <div v-for="action in monster.legendaryActions" :key="action" class="action-item">
                <p>{{ action }}</p>
              </div>
            </div>
          </section>

          <!-- Notes -->
          <section v-if="monster.notes" class="sheet-section notes">
            <h2>Notes</h2>
            <div class="notes-content">
              <p>{{ monster.notes }}</p>
            </div>
          </section>
        </div>

        <!-- Editor Modal -->
        <template #editor>
          <MonsterEditor
            v-if="showEditor"
            :monster="monster"
            :is-open="showEditor"
            @submit="handleSubmit"
            @cancel="handleCancel"
          />
        </template>
      </BaseEntityView>
    </div>
    <aside style="flex: 1 1 250px; min-width: 200px; max-width: 320px; display: flex; flex-direction: column; gap: 2rem;">
      <Mentions title="Mentions" :entities="mentions" />
      <Mentions title="Mentioned In" :entities="mentionedInEntities" />
    </aside>
  </div>
</template>

<style scoped>
.monster-sheet {
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

/* Abilities, Actions, Legendary Actions */
.ability-list,
.action-list {
  display: grid;
  gap: 1rem;
}

.ability-item,
.action-item {
  background: var(--color-background);
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.ability-item h3,
.action-item h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1.1rem;
}

.ability-item p,
.action-item p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Notes */
.notes-content {
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
