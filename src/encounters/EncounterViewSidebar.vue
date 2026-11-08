<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Encounter, InlineEditState, Pawn } from '@/types';
import { useMentionsStore } from '@/utils/storage';
import { usePawnStore } from '@/stores/pawns';
import { useEncounterStore } from '@/stores/encounters';
import TabGroup from '@/components/common/TabGroup.vue';
import EntityModeControls from '@/components/common/EntityModeControls.vue';
import Mentions from '@/components/common/Mentions.vue';
import EntityLinkingDialog from '@/components/common/EntityLinkingDialog.vue';
import PawnViewDialog from '@/pawns/PawnViewDialog.vue';
import {
  IconAt,
  IconGhost3,
  IconHeadphones,
  IconPlus,
  IconSwords,
  IconX,
} from '@tabler/icons-vue';
import { prompt } from '@/dialogs';
import { entityScenesPanel as EntityScenesPanel } from 'virtual:feature-entity-panels';

const props = defineProps<{
  encounter: Encounter;
  editState?: InlineEditState<Encounter>;
  onSetEditMode?: (value: boolean) => void | Promise<void>;
  onRunCombat?: () => void;
  onDelete?: () => void | Promise<void>;
  scenesOnly?: boolean;
}>();

const { t } = useI18n();
const mentionsStore = useMentionsStore();
const pawnStore = usePawnStore();
const encounterStore = useEncounterStore();
const localEditState = reactive<InlineEditState<Encounter>>({
  isEditMode: false,
  isVisualMode: true,
  draft: null,
});
const state = computed(() => props.editState ?? localEditState);
const activeTab = ref('pawns');
const showLinkModal = ref(false);
const viewPawn = ref<Pawn | null>(null);
const localPawns = ref<Record<string, number>>({});

const entityId = computed(() => props.encounter?.id || '');
const mentions = computed(() =>
  entityId.value
    ? mentionsStore.getLinks({ kind: 'encounter', id: entityId.value })
    : [],
);
const mentionedIn = computed(() =>
  entityId.value
    ? mentionsStore.getBacklinks({ kind: 'encounter', id: entityId.value })
    : [],
);
const tabs = computed(() => {
  if (state.value.isEditMode) {
    return [
      { id: 'pawns', label: t('encounters.tabs.pawns'), icon: IconGhost3 },
      {
        id: 'scenes',
        label: t('ambientSoundPage.scenesTab'),
        icon: IconHeadphones,
      },
    ];
  }
  return [
    { id: 'pawns', label: t('encounters.tabs.pawns'), icon: IconGhost3 },
    {
      id: 'scenes',
      label: t('ambientSoundPage.scenesTab'),
      icon: IconHeadphones,
    },
    { id: 'mentions', label: t('common.mentions'), icon: IconAt },
  ];
});

watch(
  () => state.value.isEditMode,
  (isEditing) => {
    if (isEditing && activeTab.value === 'mentions') {
      activeTab.value = 'pawns';
    }
  },
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

const allPawns = computed(() => pawnStore.filtered);
const pawnOptions = computed(() =>
  allPawns.value.map((pawn) => ({ id: pawn.id, label: pawn.name })),
);
const linkedPawnIds = computed(() => Object.keys(props.encounter?.pawns ?? {}));
const encounterPawns = computed(() => {
  const linked = props.encounter?.pawns ?? {};
  return allPawns.value.filter((pawn) => pawn.id in linked);
});

watch(showLinkModal, (isOpen) => {
  if (!isOpen) return;
  localPawns.value = JSON.parse(JSON.stringify(props.encounter?.pawns ?? {}));
});

function setPawnCount(pawnId: string, value: unknown) {
  const count = Math.max(1, parseInt(String(value ?? ''), 10) || 1);
  localPawns.value = { ...localPawns.value, [pawnId]: count };
}

function addPawns(payload: { refs: Array<{ id: string }> }) {
  const pawns: Record<string, number> = {};
  for (const ref of payload.refs) {
    pawns[ref.id] =
      localPawns.value[ref.id] ?? props.encounter.pawns?.[ref.id] ?? 1;
  }
  void encounterStore.update(props.encounter.id, { pawns });
  showLinkModal.value = false;
}

function togglePawn(pawn: Pawn, linked: boolean) {
  const pawns = { ...(props.encounter?.pawns ?? {}) };
  if (linked) {
    pawns[pawn.id] = 1;
  } else {
    delete pawns[pawn.id];
  }
  void encounterStore.update(props.encounter.id, { pawns });
}

async function openQuantityModal(pawn: Pawn) {
  const value = await prompt(
    t('encounters.pawns.setQuantityFor', { pawnName: pawn.name }),
    {
      inputType: 'number',
      modelValue: String(props.encounter.pawns?.[pawn.id] || 1),
    },
  );
  if (value === null) return;
  const count = Number(value);
  if (isNaN(count) || count < 1) return;
  const pawns = { ...props.encounter.pawns, [pawn.id]: count };
  await encounterStore.update(props.encounter.id, { pawns });
}

onMounted(async () => {
  if (props.scenesOnly) return;
  await Promise.all([mentionsStore.load(), pawnStore.load()]);
});
</script>

<template>
  <div class="side-panel-content column full-height">
    <div class="sidebar-tab-content col-grow">
      <div v-if="props.scenesOnly" class="scene-tab-panel column full-height">
        <EntityScenesPanel
          v-if="entityId && EntityScenesPanel"
          entity-type="encounter"
          :entity-id="entityId"
        />
        <div v-else class="text-caption text-grey-7 q-pa-md">
          {{ t('common.empty') }}
        </div>
      </div>
      <TabGroup
        v-else
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
            v-show="activeTab === 'pawns'"
            class="pawn-tab-panel column full-height"
          >
            <div class="pawn-list col-grow">
              <div
                v-if="encounterPawns.length === 0"
                class="text-caption text-grey-7 q-pa-md"
              >
                {{ t('encounters.pawns.none') }}
              </div>
              <QList v-else class="q-pa-none q-mb-none">
                <QItem
                  v-for="pawn in encounterPawns"
                  :key="pawn.id"
                  clickable
                  v-ripple
                  class="pawn-row"
                  @click="viewPawn = pawn"
                >
                  <QItemSection>
                    <span class="pawn-name">{{ pawn.name }}</span>
                  </QItemSection>
                  <QItemSection side class="pawn-row-actions row items-center">
                    <QBtn
                      v-if="state.isEditMode"
                      flat
                      dense
                      size="sm"
                      :title="t('common.quantity')"
                      :aria-label="t('common.quantity')"
                      @click.stop="openQuantityModal(pawn)"
                    >
                      {{ encounter.pawns[pawn.id] }}
                    </QBtn>
                    <span v-else class="text-caption text-grey-7">
                      {{ encounter.pawns[pawn.id] }}
                    </span>
                    <QBtn
                      v-if="state.isEditMode"
                      flat
                      dense
                      size="sm"
                      color="negative"
                      :title="t('common.unlink')"
                      :aria-label="t('common.unlink')"
                      @click.stop="togglePawn(pawn, false)"
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
                class="pawn-add-row"
                :title="t('encounters.pawns.linkAction')"
                :aria-label="t('encounters.pawns.linkAction')"
                @click="showLinkModal = true"
              >
                <QItemSection side>
                  <IconPlus :size="18" />
                </QItemSection>
                <QItemSection>
                  {{ t('encounters.pawns.linkAction') }}
                </QItemSection>
              </QItem>
            </QList>
          </div>

          <div
            v-show="activeTab === 'scenes'"
            class="scene-tab-panel column full-height"
          >
            <EntityScenesPanel
              v-if="entityId && EntityScenesPanel"
              entity-type="encounter"
              :entity-id="entityId"
              :editable="state.isEditMode"
            />
          </div>

          <div
            v-if="!state.isEditMode && activeTab === 'mentions'"
            class="q-pa-md"
          >
            <Mentions :title="t('common.mentions')" :entities="mentions" />
            <Mentions
              :title="t('common.mentionedIn')"
              :entities="mentionedIn"
            />
          </div>
        </template>
      </TabGroup>
    </div>

    <template v-if="!props.scenesOnly">
      <EntityLinkingDialog
        :is-open="showLinkModal"
        kind="pawn"
        :title="t('encounters.pawns.linkModalTitle')"
        :options="pawnOptions"
        :linked-ids="linkedPawnIds"
        :multiple="true"
        @add="addPawns"
        @cancel="showLinkModal = false"
      >
        <template #item-extra="{ item, selected }">
          <QInput
            v-if="selected"
            type="number"
            class="pawn-quantity-input"
            :model-value="localPawns[item.id] ?? 1"
            :aria-label="t('common.quantity')"
            min="1"
            dense
            outlined
            @update:model-value="(val) => setPawnCount(item.id, val)"
            @click.stop
            @mousedown.stop
            @keydown.stop
          />
        </template>
      </EntityLinkingDialog>

      <PawnViewDialog
        :is-open="!!viewPawn"
        :pawn="viewPawn"
        @cancel="viewPawn = null"
      />

      <QList
        v-if="!state.isEditMode && props.onRunCombat"
        class="encounter-sidebar-actions"
      >
        <QItem>
          <QItemSection>
            <QBtn
              class="full-width run-combat-button"
              color="warning"
              :title="t('common.runCombat')"
              :aria-label="t('common.runCombat')"
              @click="props.onRunCombat?.()"
            >
              <IconSwords :size="18" class="q-mr-sm" />
              {{ t('common.runCombat') }}
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
    </template>
  </div>
</template>

<style scoped>
.sidebar-tab-content {
  min-height: 0;
  overflow-y: auto;
}

.pawn-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.pawn-name {
  color: var(--color-text);
}

.pawn-row-actions {
  gap: 0.15rem;
}

.pawn-quantity-input {
  width: 72px;
}

.encounter-sidebar-actions {
  flex: 0 0 auto;
}
</style>
