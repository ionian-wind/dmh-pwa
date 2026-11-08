<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { usePartyStore } from '@/stores/parties';
import { useCombatStore } from '@/stores/combats';
import { usePawnStore } from '@/stores/pawns';
import { useCharacterStore } from '@/stores/characters';
import { useEncounterStore } from '@/stores/encounters';
import { generateId } from '@/utils/storage';
import { Combat, Combatant, Encounter, Party } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import { useI18n } from 'vue-i18n';
import EntityLinkingList from '@/components/common/EntityLinkingList.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import type { MapEntityRef } from '@/maps/types';

const partyStore = usePartyStore();
const combatStore = useCombatStore();
const pawnStore = usePawnStore();
const characterStore = useCharacterStore();
const encounterStore = useEncounterStore();
const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    encounter?: Encounter | null;
    party?: Party | null;
  }>(),
  { encounter: null, party: null },
);

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'combat-created', combat: Combat): void;
}>();

const selectedPartyId = ref<string>(props.party?.id ?? '');
const selectedEncounterId = ref<string>('');
const selectedCharacters = ref<string[]>([]);

const activePartyId = computed(() => props.party?.id ?? selectedPartyId.value);
const activeParty = computed(
  () => props.party ?? partyStore.getById(selectedPartyId.value),
);
const activeEncounter = computed(
  () => props.encounter ?? encounterStore.getById(selectedEncounterId.value),
);

const partyOptions = computed(() =>
  partyStore.filtered.map((party) => ({ id: party.id, label: party.name })),
);

const selectedPartyIds = computed(() =>
  selectedPartyId.value ? [selectedPartyId.value] : [],
);

const encounterOptions = computed(() =>
  encounterStore.filtered.map((encounter) => ({
    id: encounter.id,
    label: encounter.name,
  })),
);

const selectedEncounterIds = computed(() =>
  selectedEncounterId.value ? [selectedEncounterId.value] : [],
);

const selectedCharacterIds = computed(() => selectedCharacters.value);

const selectedCharacterRefs = computed<MapEntityRef[]>(() =>
  selectedCharacterIds.value.map((id) => ({ kind: 'character', id })),
);

function setPartyIds(ids: string[]) {
  selectedPartyId.value = ids[0] ?? '';
}

function setEncounterIds(ids: string[]) {
  selectedEncounterId.value = ids[0] ?? '';
}

function setCharacterIds(ids: string[]) {
  selectedCharacters.value = [...new Set(ids)];
}

function setCharacterRefs(refs: MapEntityRef[]) {
  setCharacterIds(
    refs.filter((ref) => ref.kind === 'character').map((ref) => ref.id),
  );
}

onMounted(async () => {
  await Promise.all([
    partyStore.load(),
    pawnStore.load(),
    characterStore.load(),
    combatStore.load(),
    encounterStore.load(),
  ]);
});

// Initialize character toggles whenever the active party changes.
watch(
  activePartyId,
  (partyId) => {
    if (!partyId) {
      selectedCharacters.value = [];
      return;
    }
    const party = partyStore.getById(partyId);
    if (party) {
      selectedCharacters.value = [...party.characters];
    }
  },
  { immediate: true },
);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    selectedEncounterId.value = '';
    selectedPartyId.value = props.party?.id ?? '';
  },
);

const handleCreateCombat = async () => {
  const encounter = activeEncounter.value;
  if (!encounter || !activePartyId.value || !activeParty.value) {
    return;
  }

  // Get selected characters in selection order
  const partyCharacters = selectedCharacterIds.value
    .map((id) => characterStore.getById(id))
    .filter((char): char is NonNullable<typeof char> => !!char);
  if (partyCharacters.length === 0) {
    return;
  }

  // Get encounter pawns
  const encounterPawns = pawnStore.items.filter((m) =>
    Object.keys(encounter.pawns || {}).includes(m.id),
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

  // Create combatants from pawns with counts
  const pawnCombatants: Combatant[] = [];
  encounterPawns.forEach((pawn) => {
    const count = encounter.pawns[pawn.id] || 1;
    for (let i = 0; i < count; i++) {
      pawnCombatants.push({
        id: generateId(),
        type: 'pawn',
        referenceId: pawn.id,
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
  const allCombatants = [...characterCombatants, ...pawnCombatants];

  // Create the combat
  const newCombat: Omit<Combat, 'id' | 'createdAt' | 'updatedAt'> = {
    encounterId: encounter.id,
    partyId: activePartyId.value,
    status: 'preparing',
    currentRound: 0,
    currentTurn: 0,
    combatants: allCombatants,
  };

  const createdCombat = await combatStore.create(newCombat);
  emit('combat-created', createdCombat);
};

const handleCancel = () => {
  selectedPartyId.value = '';
  selectedEncounterId.value = '';
  emit('cancel');
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
              {{ activeEncounter?.name }}
            </p>
            <p>
              <strong>{{ t('partySelector.pawns') }}</strong>
              {{
                Object.values(activeEncounter?.pawns || {}).reduce(
                  (sum, count) => sum + count,
                  0,
                )
              }}
            </p>
          </div>
        </div>
        <div v-if="activeParty" class="party-info">
          <h4>{{ t('partySelector.partyInformation') }}</h4>
          <div class="party-details">
            <p>
              <strong>{{ t('partySelector.party') }}</strong>
              {{ activeParty.name }}
            </p>
            <p>
              <strong>{{ t('partySelector.characters') }}</strong>
              {{ activeParty.characters.length }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="party" class="form-section">
        <h4>{{ t('partySelector.encounter') }}</h4>
        <EntityLinkingList
          kind="encounter"
          :options="encounterOptions"
          :multiple="false"
          :model-value="selectedEncounterIds"
          @update:model-value="setEncounterIds"
        />
      </div>

      <div v-else class="form-section">
        <h4>{{ t('partySelector.party') }}</h4>
        <EntityLinkingList
          kind="party"
          :options="partyOptions"
          :multiple="false"
          :model-value="selectedPartyIds"
          @update:model-value="setPartyIds"
        />
      </div>

      <div v-if="activePartyId">
        <h4>{{ t('partySelector.selectCharacters') }}</h4>
        <div v-if="selectedCharacterIds.length === 0" class="info-text">
          {{ t('partySelector.selectAtLeastOneCharacter') }}
        </div>
        <EntitiesLinking
          kind="character"
          :model-value="selectedCharacterRefs"
          @update:model-value="setCharacterRefs"
        />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.party-selector {
  padding: 1rem 0;
}

.form-section {
  margin-bottom: 1.5rem;
}

.form-section h4 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1rem;
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
