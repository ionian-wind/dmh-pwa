<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { usePartyStore } from '@/stores/parties';
import { useCombatStore } from '@/stores/combats';
import { useMonsterStore } from '@/stores/monsters';
import { useCharacterStore } from '@/stores/characters';
import { Combat, Combatant, Encounter } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from '@/components/form/Button.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

const partyStore = usePartyStore();
const combatStore = useCombatStore();
const monsterStore = useMonsterStore();
const characterStore = useCharacterStore();
const router = useRouter();
const { t } = useI18n();

const props = defineProps<{
  isOpen: boolean;
  encounter: Encounter | null;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'combat-created', combat: Combat): void;
}>();

const selectedPartyId = ref<string>('');
const selectedCharacters = ref<Record<string, boolean>>({});

onMounted(async () => {
  await Promise.all([
    partyStore.load(),
    monsterStore.load(),
    characterStore.load(),
    combatStore.load(),
  ]);
});

// Watch for party selection and initialize togglers
watch(selectedPartyId, (partyId) => {
  if (!partyId) {
    selectedCharacters.value = {};
    return;
  }
  const party = partyStore.getById(partyId);
  if (party) {
    const toggles: Record<string, boolean> = {};
    party.characters.forEach((cid) => {
      toggles[cid] = true;
    });
    selectedCharacters.value = toggles;
  }
});

const handleCreateCombat = async () => {
  if (!props.encounter || !selectedPartyId.value) {
    return;
  }

  const selectedParty = partyStore.getById(selectedPartyId.value);
  if (!selectedParty) {
    return;
  }

  // Get selected party characters
  const partyCharacters = characterStore.items.filter(
    (char) => selectedCharacters.value[char.id],
  );
  if (partyCharacters.length === 0) {
    return;
  }

  // Get encounter monsters
  const encounterMonsters = monsterStore.items.filter((m) =>
    Object.keys(props.encounter!.monsters || {}).includes(m.id),
  );

  // Create combatants from characters
  const characterCombatants: Combatant[] = partyCharacters.map((char) => ({
    id: generateId(),
    type: 'player',
    referenceId: char.id,
    notes: '',
    initiative: 0,
    hasActed: false,
    isPostponed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  // Create combatants from monsters with counts
  const monsterCombatants: Combatant[] = [];
  encounterMonsters.forEach((monster) => {
    const count = props.encounter!.monsters[monster.id] || 1;
    for (let i = 0; i < count; i++) {
      monsterCombatants.push({
        id: generateId(),
        type: 'monster',
        referenceId: monster.id,
        notes: '',
        initiative: 0,
        hasActed: false,
        isPostponed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  });

  // Combine all combatants
  const allCombatants = [...characterCombatants, ...monsterCombatants];

  // Create the combat
  const newCombat: Omit<Combat, 'id' | 'createdAt' | 'updatedAt'> = {
    encounterId: props.encounter.id,
    partyId: selectedPartyId.value,
    status: 'preparing',
    currentRound: 0,
    currentTurn: 0,
    combatants: allCombatants,
  };

  const createdCombat = await combatStore.create(newCombat);
  router.push(`/combats/${createdCombat.id}`);
};

const handleCancel = () => {
  selectedPartyId.value = '';
  emit('cancel');
};

const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="t('partySelector.startCombat')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('partySelector.startCombat')"
    :cancelLabel="t('common.cancel')"
    modalId="party-selector-modal"
    @submit="handleCreateCombat"
    @cancel="handleCancel"
  >
    <div class="party-selector">
      <div class="info-row">
        <div class="encounter-info">
          <h4>{{ t('partySelector.encounterInformation') }}</h4>
          <div class="encounter-details">
            <p>
              <strong>{{ t('partySelector.encounter') }}</strong>
              {{ encounter?.name }}
            </p>
            <p>
              <strong>{{ t('partySelector.monsters') }}</strong>
              {{
                Object.values(encounter?.monsters || {}).reduce(
                  (sum, count) => sum + count,
                  0,
                )
              }}
            </p>
          </div>
        </div>
        <div v-if="selectedPartyId" class="party-info">
          <h4>{{ t('partySelector.partyInformation') }}</h4>
          <div class="party-details">
            <p>
              <strong>{{ t('partySelector.party') }}</strong>
              {{ partyStore.getById(selectedPartyId)?.name }}
            </p>
            <p>
              <strong>{{ t('partySelector.characters') }}</strong>
              {{ characterStore.items.length }}
            </p>
          </div>
        </div>
      </div>

      <div class="form-section">
        <QSelect
          v-model="selectedPartyId"
          :options="
            partyStore.filtered.map((party) => ({
              label: party.name,
              value: party.id,
            }))
          "
          :label="t('partySelector.chooseParty')"
          emit-value
          map-options
          dense
          outlined
          required
        />
      </div>

      <div v-if="selectedPartyId">
        <template v-if="partyStore.getById(selectedPartyId)">
          <h4>{{ t('partySelector.selectCharacters') }}</h4>
          <div
            v-if="
              Object.values(selectedCharacters).filter(Boolean).length === 0
            "
            class="info-text"
          >
            {{ t('partySelector.selectAtLeastOneCharacter') }}
          </div>
          <div class="character-list">
            <div
              v-for="charId in partyStore.getById(selectedPartyId)
                ?.characters || []"
              :key="charId"
              class="character-toggle-row"
            >
              <ToggleSwitch
                :model-value="selectedCharacters[charId]"
                @update:model-value="
                  (val) => (selectedCharacters[charId] = val)
                "
                :label="characterStore.getById(charId)?.name || charId"
              />
            </div>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <Button
        :submitLabel="t('common.startCombat')"
        :disabled="
          !selectedPartyId ||
          Object.values(selectedCharacters).filter(Boolean).length === 0
        "
      />
    </template>
  </BaseModal>
</template>

<style scoped>
.party-selector {
  padding: 1rem 0;
}

.form-section {
  margin-bottom: 1.5rem;
}

.form-section label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-weight: var(--font-medium);
}

.form-section select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background-soft);
  color: var(--color-text);
}

.info-row {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.party-info,
.encounter-info {
  flex: 1 1 250px;
  min-width: 220px;
  margin-bottom: 0;
}

.party-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1rem;
}

.party-details {
  margin: 0;
}

.party-details p {
  margin: 0.25rem 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.party-details strong {
  color: var(--color-text);
}

.encounter-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1rem;
}

.encounter-details {
  margin: 0;
}

.encounter-details p {
  margin: 0.25rem 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.encounter-details strong {
  color: var(--color-text);
}

.info-text {
  margin-bottom: 1rem;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.character-list {
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  margin-top: 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.character-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s;
}

.character-toggle-row:last-child {
  border-bottom: none;
}

.character-toggle-row:hover {
  background-color: var(--color-background-soft);
}

@media (max-width: 700px) {
  .info-row {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
