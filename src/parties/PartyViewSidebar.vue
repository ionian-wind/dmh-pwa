<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Character, InlineEditState, Party } from '@/types';

import { useMentionsStore } from '@/utils/storage';
import { useCharacterStore } from '@/stores/characters';
import { usePartyStore } from '@/stores/parties';

import Mentions from '@/components/common/Mentions.vue';
import EntityModeControls from '@/components/common/EntityModeControls.vue';
import EntityLinkingDialog from '@/components/common/EntityLinkingDialog.vue';
import EntityInfoDialog from '@/components/common/EntityInfoDialog.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { entityRoute } from '@/components/common/entityLinking/entityRefs';
import {
  IconAt,
  IconHeadphones,
  IconPlus,
  IconSwords,
  IconUsers,
  IconX,
} from '@tabler/icons-vue';
import { entityScenesPanel as EntityScenesPanel } from 'virtual:feature-entity-panels';

const mentionsStore = useMentionsStore();
const characterStore = useCharacterStore();
const partyStore = usePartyStore();
const { t } = useI18n();

const props = defineProps<{
  party: Party;
  editState?: InlineEditState<Party>;
  onSetEditMode?: (value: boolean) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onStartCombat?: () => void;
}>();

const localEditState = reactive<InlineEditState<Party>>({
  isEditMode: false,
  isVisualMode: true,
  draft: null,
});

const state = computed(() => props.editState ?? localEditState);
const activeTab = ref('characters');
const showLinkModal = ref(false);
const viewCharacter = ref<Character | null>(null);
const viewCharacterRoute = computed(() =>
  viewCharacter.value
    ? entityRoute('character', viewCharacter.value.id)
    : undefined,
);

const currentParty = computed(() => state.value.draft ?? props.party);
const characterIds = computed(() => currentParty.value?.characters ?? []);
const partyCharacters = computed(() =>
  characterIds.value
    .map((id) => characterStore.getById(id))
    .filter((character): character is Character => !!character),
);
const characterOptions = computed(() =>
  characterStore.filtered.map((character) => ({
    id: character.id,
    label: character.name,
  })),
);

const tabs = computed(() => {
  const base = [
    {
      id: 'characters',
      label: t('parties.fields.characters'),
      icon: IconUsers,
    },
    {
      id: 'scenes',
      label: t('ambientSoundPage.scenesTab'),
      icon: IconHeadphones,
    },
  ];
  return state.value.isEditMode
    ? base
    : [...base, { id: 'mentions', label: t('common.mentions'), icon: IconAt }];
});

watch(
  () => state.value.isEditMode,
  (isEditing) => {
    if (isEditing && activeTab.value === 'mentions') {
      activeTab.value = 'characters';
    }
  },
);

const mentions = computed(() =>
  props.party
    ? mentionsStore.getLinks({ kind: 'party', id: props.party.id })
    : [],
);

const mentionedIn = computed(() =>
  props.party
    ? mentionsStore.getBacklinks({
        kind: 'party',
        id: props.party.id,
      })
    : [],
);

function setEditMode(value: boolean) {
  if (props.onSetEditMode) {
    void props.onSetEditMode(value);
    return;
  }
  state.value.isEditMode = value;
}

function setVisualMode(value: boolean) {
  state.value.isVisualMode = value;
}

function setCharacters(ids: string[]) {
  const characters = [...new Set(ids)];
  if (state.value.draft) {
    state.value.draft.characters = characters;
    return;
  }
  void partyStore.update(props.party.id, { characters });
}

function addCharacters(payload: { refs: Array<{ id: string }> }) {
  setCharacters(payload.refs.map((ref) => ref.id));
  showLinkModal.value = false;
}

function toggleCharacter(character: Character, linked: boolean) {
  const ids = characterIds.value;
  setCharacters(
    linked ? [...ids, character.id] : ids.filter((id) => id !== character.id),
  );
}

onMounted(async () => {
  await Promise.all([mentionsStore.load(), characterStore.load()]);
});
</script>

<template>
  <div class="side-panel-content column full-height">
    <div class="sidebar-tab-content col-grow">
      <TabGroup
        class="full-height"
        :align="'justify'"
        :title-align="'center'"
        v-model="activeTab"
        :tabs="tabs"
        size="sm"
        icon-only
      >
        <template #default>
          <div
            v-show="activeTab === 'characters'"
            class="character-tab-panel column full-height"
          >
            <div class="character-list col-grow">
              <div
                v-if="partyCharacters.length === 0"
                class="text-caption text-grey-7 q-pa-md"
              >
                {{ t('partyView.noCharacters') }}
              </div>
              <QList v-else class="q-pa-none q-mb-none">
                <QItem
                  v-for="character in partyCharacters"
                  :key="character.id"
                  clickable
                  v-ripple
                  class="character-row"
                  @click="viewCharacter = character"
                >
                  <QItemSection>
                    <span class="character-name">{{ character.name }}</span>
                  </QItemSection>
                  <QItemSection
                    v-if="state.isEditMode"
                    side
                    class="character-row-actions row items-center"
                  >
                    <QBtn
                      flat
                      dense
                      size="sm"
                      color="negative"
                      :title="t('partyView.unlink')"
                      :aria-label="t('partyView.unlink')"
                      @click.stop="toggleCharacter(character, false)"
                    >
                      <IconX :size="16" />
                    </QBtn>
                  </QItemSection>
                </QItem>
              </QList>
            </div>

            <QSeparator />

            <QList v-if="state.isEditMode" class="q-pa-none q-mb-none">
              <QItem
                clickable
                v-ripple
                class="character-add-row"
                :title="t('parties.linkCharacters')"
                :aria-label="t('parties.linkCharacters')"
                @click="showLinkModal = true"
              >
                <QItemSection side>
                  <IconPlus :size="18" />
                </QItemSection>
                <QItemSection>
                  {{ t('parties.linkCharacters') }}
                </QItemSection>
              </QItem>
            </QList>
          </div>

          <div
            v-show="activeTab === 'scenes'"
            class="scene-tab-panel column full-height"
          >
            <EntityScenesPanel
              v-if="props.party && EntityScenesPanel"
              entity-type="party"
              :entity-id="props.party.id"
              :editable="state.isEditMode"
              :scenes-enabled="false"
            />
          </div>
          <div v-show="activeTab === 'mentions'" class="q-pa-md">
            <Mentions :title="t('common.mentions')" :entities="mentions" />
            <Mentions
              :title="t('common.mentionedIn')"
              :entities="mentionedIn"
            />
          </div>
        </template>
      </TabGroup>
    </div>

    <EntityLinkingDialog
      :is-open="showLinkModal"
      kind="character"
      :title="t('parties.linkCharacters')"
      :options="characterOptions"
      :linked-ids="characterIds"
      :multiple="true"
      @add="addCharacters"
      @cancel="showLinkModal = false"
    />

    <EntityInfoDialog
      :is-open="!!viewCharacter"
      :title="viewCharacter?.name ?? ''"
      :picture="viewCharacter?.picture"
      :notes="viewCharacter?.notes ?? ''"
      :to="viewCharacterRoute"
      entity-kind="character"
      :entity-id="viewCharacter?.id"
      @cancel="viewCharacter = null"
    />

    <QList
      v-if="!state.isEditMode && props.onStartCombat"
      class="party-sidebar-actions"
    >
      <QItem>
        <QItemSection>
          <QBtn
            class="full-width start-combat-button"
            color="warning"
            :title="t('partySelector.startCombat')"
            :aria-label="t('partySelector.startCombat')"
            @click="props.onStartCombat?.()"
          >
            <IconSwords :size="18" class="q-mr-sm" />
            {{ t('partySelector.startCombat') }}
          </QBtn>
        </QItemSection>
      </QItem>
    </QList>

    <QSeparator />
    <EntityModeControls
      :is-edit-mode="state.isEditMode"
      :is-visual-mode="state.isVisualMode"
      :on-delete="props.onDelete"
      @update:is-edit-mode="setEditMode"
      @update:is-visual-mode="setVisualMode"
    />
  </div>
</template>

<style scoped>
.sidebar-tab-content {
  min-height: 0;
  overflow-y: auto;
}

.character-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.character-name {
  color: var(--color-text);
}

.character-row-actions {
  gap: 0.15rem;
}

.party-sidebar-actions {
  flex: 0 0 auto;
}
</style>
