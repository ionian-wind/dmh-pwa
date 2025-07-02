<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import { useCharacterStore } from '@/stores/characters';
import { Party, PlayerCharacter } from '@/types';
import PartyEditor from '@/components/PartyEditor.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Button from '@/components/common/Button.vue';
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/utils/storage';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const router = useRouter();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const characterStore = useCharacterStore();
const mentionsStore = useMentionsStore();
const { t } = useI18n();

const showEditor = ref(false);
const showLinkModal = ref(false);

const isLoaded = computed(() => partyStore.isLoaded);
const party = computed(() => partyStore.getById(route.params.id as string));
const loading = computed(() => !isLoaded.value);
const notFound = computed(() => isLoaded.value && !party.value);

const modules = computed(() => {
  return party.value?.moduleIds
    ?.map(id => moduleStore.getById(id))
    .filter(Boolean) || [];
});

const allCharacters = computed(() => characterStore.items);
const partyCharacters = computed(() => {
  const p = party.value;
  if (!p) return [];
  return allCharacters.value.filter(c => p.characters.includes(c.id));
});

const linkedCharacters = computed(() => {
  const p = party.value;
  if (!p) return {};
  return allCharacters.value.reduce((acc, character) => {
    acc[character.id] = p.characters.includes(character.id);
    return acc;
  }, {} as Record<string, boolean>);
});

const mentionedEntities = computed(() => {
  if (!party.value) return [];
  return mentionsStore.getLinks({ kind: 'party', id: party.value.id });
});
const mentionedInEntities = computed(() => {
  if (!party.value) return [];
  return mentionsStore.getBacklinks({ kind: 'party', id: party.value.id });
});

const handleDeleteParty = async () => {
  if (!party.value) return;
  if (confirm(`Are you sure you want to delete ${party.value.name}?`)) {
    await partyStore.remove(party.value.id);
    router.push('/parties');
  }
};

const handleSaveParty = async (updatedParty: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!party.value) return;
  await partyStore.update(party.value.id, updatedParty);
  showEditor.value = false;
};

const handlePartyCancel = () => {
  showEditor.value = false;
};

const handleToggleCharacter = (character: PlayerCharacter, isLinked: boolean) => {
  if (!party.value) return;
  let updatedCharacters = [...party.value.characters];
  if (isLinked) {
    if (!updatedCharacters.includes(character.id)) {
      updatedCharacters.push(character.id);
    }
  } else {
    updatedCharacters = updatedCharacters.filter(id => id !== character.id);
  }
  partyStore.update(party.value.id, { characters: updatedCharacters });
};

// Computed properties for BaseEntityView
const partyTitle = computed(() => party.value?.name || '');
const partySubtitle = computed(() => {
  if (!party.value) return '';
  
  const parts = [];
  if (modules.value.length > 0) {
    parts.push(`Modules: ${modules.value.map(m => m?.name).filter(Boolean).join(', ')}`);
  }
  parts.push(`${partyCharacters.value.length} characters`);
  
  return parts.join(' • ');
});

onMounted(async () => {
  await Promise.all([
    partyStore.load(),
    characterStore.load(),
    moduleStore.load(),
    mentionsStore.load(),
  ]);
});
</script>

<template>
  <div>
    <BaseEntityView
      :entity="party"
      entity-name="parties.title"
      list-route="/parties"
      :on-delete="handleDeleteParty"
      :on-edit="() => showEditor = true"
      :is-editing="showEditor"
      :title="partyTitle"
      :subtitle="partySubtitle"
      :not-found="notFound"
      :loading="loading"
    >
      <!-- Party Content -->
      <div v-if="party" class="party-content">
        <section class="content-section">
          <div class="section-header">
            <h2>{{ $t('partyView.title') }}</h2>
            <Button @click="showLinkModal = true" class="link-btn">
              {{ $t('parties.linkCharacters') }}
            </Button>
          </div>
          <div v-if="partyCharacters.length === 0" class="empty-state">
            <p>{{ $t('partyView.noCharacters') }}</p>
          </div>
          <div v-else class="characters-grid">
            <table>
              <thead>
                <tr>
                  <th>{{ $t('partyView.name') }}</th>
                  <th>{{ $t('partyView.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="character in partyCharacters" :key="character.id">
                  <td>{{ character.name }}</td>
                  <td>
                    <button class="unlink-btn" @click="handleToggleCharacter(character, false)">{{ $t('partyView.unlink') }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Editor Modal -->
      <template #editor>
        <PartyEditor
          :party="party"
          :isOpen="showEditor"
          @submit="handleSaveParty"
          @cancel="handlePartyCancel"
        />
      </template>

      <template #sidepanel>
        <Mentions :title="t('common.mentions')" :entities="mentionedEntities" />
        <Mentions :title="t('common.mentionedIn')" :entities="mentionedInEntities" />
      </template>
    </BaseEntityView>
    
    <!-- Link Characters Modal -->
    <BaseModal
      :is-open="showLinkModal"
      :title="t('parties.linkCharacters')"
      :show-cancel="true"
      :show-submit="false"
      :cancel-label="t('common.close')"
      modal-id="link-characters-modal"
      @cancel="showLinkModal = false"
    >
      <div v-if="allCharacters.length === 0" class="empty-state">
        <p>{{ t('partyView.noAvailable') }}</p>
      </div>
      <div v-else class="characters-grid">
        <table>
          <thead>
            <tr>
              <th>{{ t('partyView.name') }}</th>
              <th>{{ t('partyView.linked') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="character in allCharacters" :key="character.id">
              <td>{{ character.name }}</td>
              <td>
                <ToggleSwitch
                  :model-value="linkedCharacters[character.id]"
                  @update:modelValue="(value) => handleToggleCharacter(character, value)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.party-content {
  display: grid;
  gap: 2rem;
}

.content-section {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.content-section h2 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.3rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.section-header h2 {
  margin: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.characters-grid {
  overflow-x: auto;
}

.characters-grid table {
  width: 100%;
  border-collapse: collapse;
}

.characters-grid th,
.characters-grid td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.characters-grid th {
  background: var(--color-background);
  font-weight: 600;
  color: var(--color-text);
}

.characters-grid td {
  color: var(--color-text-light);
}

.unlink-btn {
  background: var(--color-danger);
  color: var(--color-text-inverse);
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.8rem;
}

.unlink-btn:hover {
  background: var(--color-danger-dark);
}

.empty-state {
  color: var(--color-text-light);
  text-align: center;
  padding: 2rem;
  font-style: italic;
}

.link-btn {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.8rem;
}

.link-btn:hover {
  background: var(--color-primary-dark);
}
</style>
