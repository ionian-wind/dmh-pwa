<script setup lang="ts">
import { ref, computed, onMounted, inject, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { type ComponentInjection, Party, PlayerCharacter } from '@/types';

import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import { useCharacterStore } from '@/stores/characters';

import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Button from '@/components/form/Button.vue';

import PartyEditor from '@/parties/PartyEditor.vue';
import PartyViewSidebar from '@/parties/PartyViewSidebar.vue';

const route = useRoute();
const router = useRouter();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const characterStore = useCharacterStore();
const { t } = useI18n();

const showEditor = ref(false);
const showLinkModal = ref(false);

const isLoaded = computed(() => partyStore.isLoaded);
const party = computed(() => partyStore.getById(route.params.id as string));
const loading = computed(() => !isLoaded.value);
const notFound = computed(() => isLoaded.value && !party.value);

const modules = computed(() => {
  return (
    party.value?.moduleIds
      ?.map((id) => moduleStore.getById(id))
      .filter(Boolean) || []
  );
});

const allCharacters = computed(() => characterStore.items);
const partyCharacters = computed(() => {
  const p = party.value;
  if (!p) return [];
  return allCharacters.value.filter((c) => p.characters.includes(c.id));
});

const linkedCharacters = computed(() => {
  const p = party.value;
  if (!p) return {};
  return allCharacters.value.reduce(
    (acc, character) => {
      acc[character.id] = p.characters.includes(character.id);
      return acc;
    },
    {} as Record<string, boolean>,
  );
});

async function handleDeleteParty() {
  if (party.value && await confirm(t('common.confirmDelete', { title: party.value.name }))) {
    await partyStore.remove(party.value.id);
  }
}

const handleSaveParty = async (
  updatedParty: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  if (!party.value) return;
  await partyStore.update(party.value.id, updatedParty);
  showEditor.value = false;
};

const handlePartyCancel = () => {
  showEditor.value = false;
};

const handleToggleCharacter = (
  character: PlayerCharacter,
  isLinked: boolean,
) => {
  if (!party.value) return;
  let updatedCharacters = [...party.value.characters];
  if (isLinked) {
    if (!updatedCharacters.includes(character.id)) {
      updatedCharacters.push(character.id);
    }
  } else {
    updatedCharacters = updatedCharacters.filter((id) => id !== character.id);
  }
  partyStore.update(party.value.id, { characters: updatedCharacters });
};

// Computed properties for BaseEntityView
const partyTitle = computed(() => party.value?.name || '');
const partySubtitle = computed(() => {
  if (!party.value) return '';

  const parts = [];
  if (modules.value.length > 0) {
    parts.push(
      `Modules: ${modules.value
        .map((m) => m?.name)
        .filter(Boolean)
        .join(', ')}`,
    );
  }
  parts.push(`${partyCharacters.value.length} characters`);

  return parts.join(' • ');
});
const setRightDrawerContent = inject('setRightDrawerContent') as (
  arg: ComponentInjection,
) => void;

onMounted(async () => {
  await Promise.all([
    partyStore.load(),
    characterStore.load(),
    moduleStore.load(),
  ]);
  setRightDrawerContent({ component: PartyViewSidebar, props: { party } });
});

onBeforeUnmount(() => {
  setRightDrawerContent(null);
});
</script>

<template>
  <div>
    <BaseEntityView
      :entity="party"
      entity-name="parties.title"
      list-route="/parties"
      :on-delete="handleDeleteParty"
      :on-edit="() => (showEditor = true)"
      :is-editing="showEditor"
      :title="partyTitle"
      :subtitle="partySubtitle"
      :not-found="notFound"
      :loading="loading"
    >
      <!-- Party Content -->
      <div v-if="party">
        <div class="q-pa-md q-gutter-md">
          <div class="row items-center q-mb-md">
            <div class="col">
              <h2>{{ t('partyView.title') }}</h2>
            </div>
            <div class="col-auto">
              <QBtn flat @click="showLinkModal = true" class="q-ml-md">
                {{ t('parties.linkCharacters') }}
              </QBtn>
            </div>
          </div>
          <div
            v-if="partyCharacters.length === 0"
            class="q-pa-md text-grey text-center q-mt-xl"
          >
            <p>{{ t('partyView.noCharacters') }}</p>
          </div>
          <div v-else class="row q-gutter-md">
            <div class="col-12">
              <table class="q-table">
                <thead>
                  <tr>
                    <th>{{ t('partyView.name') }}</th>
                    <th>{{ t('partyView.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="character in partyCharacters" :key="character.id">
                    <td>{{ character.name }}</td>
                    <td>
                      <button
                        class="q-btn q-btn--flat text-negative"
                        @click="handleToggleCharacter(character, false)"
                      >
                        {{ t('partyView.unlink') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
      <div
        v-if="allCharacters.length === 0"
        class="q-pa-md text-grey text-center q-mt-xl"
      >
        <p>{{ t('partyView.noAvailable') }}</p>
      </div>
      <div v-else class="row q-gutter-md">
        <div class="col-12">
          <table class="q-table">
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
                    @update:modelValue="
                      (value) => handleToggleCharacter(character, value)
                    "
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
/* Removed .content-section, .section-header, .empty-state, .characters-grid. Use Quasar classes. */
</style>
