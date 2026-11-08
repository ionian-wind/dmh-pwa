<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Encounter, Pawn } from '@/types';
import { useMentionsStore } from '@/utils/storage';
import { usePawnStore } from '@/stores/pawns';
import { useEncounterStore } from '@/stores/encounters';
import TabGroup from '@/components/common/TabGroup.vue';
import Mentions from '@/components/common/Mentions.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import { IconAt, IconGhost3, IconPlus, IconX } from '@tabler/icons-vue';
import { prompt } from '@/dialogs';
import { entityScenesPanel as EntityScenesPanel } from 'virtual:feature-entity-panels';

const props = defineProps<{
  encounter: Encounter;
}>();

const { t } = useI18n();
const mentionsStore = useMentionsStore();
const pawnStore = usePawnStore();
const encounterStore = useEncounterStore();
const activeTab = ref('pawns');
const showLinkModal = ref(false);
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
const tabs = computed(() => [
  { id: 'pawns', label: t('encounters.tabs.pawns'), icon: IconGhost3 },
  { id: 'scenes', label: t('ambientSoundPage.scenesTab') },
  { id: 'mentions', label: t('common.mentions'), icon: IconAt },
]);

const allPawns = computed(() => pawnStore.filtered);
const encounterPawns = computed(() => {
  const linked = props.encounter?.pawns ?? {};
  return allPawns.value.filter((pawn) => pawn.id in linked);
});

watch(showLinkModal, (isOpen) => {
  if (!isOpen) return;
  localPawns.value = JSON.parse(JSON.stringify(props.encounter?.pawns ?? {}));
});

function togglePawn(pawn: Pawn, linked: boolean) {
  const pawns = { ...(props.encounter?.pawns ?? {}) };
  if (linked) {
    pawns[pawn.id] = 1;
  } else {
    delete pawns[pawn.id];
  }
  void encounterStore.update(props.encounter.id, { pawns });
}

function handleModalTogglePawn(pawnId: string, linked: boolean) {
  const current = { ...localPawns.value };
  if (linked) {
    if (current[pawnId] === undefined) current[pawnId] = 1;
  } else {
    delete current[pawnId];
  }
  localPawns.value = current;
}

function handleModalQuantityChange(pawnId: string, count: number) {
  if (localPawns.value[pawnId] === undefined) return;
  localPawns.value[pawnId] = Math.max(1, count || 1);
}

async function savePawnLinks() {
  await encounterStore.update(props.encounter.id, {
    pawns: localPawns.value,
  });
  showLinkModal.value = false;
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
  await Promise.all([mentionsStore.load(), pawnStore.load()]);
});
</script>

<template>
  <div class="side-panel-content column full-height">
    <div class="sidebar-tab-content col-grow">
      <TabGroup
        :align="'justify'"
        :title-align="'center'"
        v-model="activeTab"
        :tabs="tabs"
        size="sm"
        icon-only
      >
        <template #default>
          <div v-show="activeTab === 'pawns'">
            <QList class="q-pa-none q-mb-none">
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

            <QSeparator />

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
                class="pawn-row"
              >
                <QItemSection side>
                  <IconGhost3 :size="18" />
                </QItemSection>
                <QItemSection>
                  <router-link :to="`/pawns/${pawn.id}`" class="pawn-link">
                    {{ pawn.name }}
                  </router-link>
                </QItemSection>
                <QItemSection side class="pawn-row-actions row items-center">
                  <QBtn
                    flat
                    dense
                    size="sm"
                    :title="t('common.quantity')"
                    :aria-label="t('common.quantity')"
                    @click.stop="openQuantityModal(pawn)"
                  >
                    {{ encounter.pawns[pawn.id] }}
                  </QBtn>
                  <QBtn
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

          <div v-show="activeTab === 'scenes'" class="q-pa-md">
            <EntityScenesPanel
              v-if="entityId && EntityScenesPanel"
              entity-type="encounter"
              :entity-id="entityId"
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

    <BaseModal
      :is-open="showLinkModal"
      @cancel="showLinkModal = false"
      @submit="savePawnLinks"
      :title="t('encounters.pawns.linkModalTitle')"
      modal-id="pawn-linking-modal"
      :show-cancel="true"
      :show-submit="true"
      :cancel-label="t('common.cancel')"
      :submit-label="t('common.save')"
    >
      <div
        v-if="allPawns.length === 0"
        class="q-pa-md text-caption text-grey-7"
      >
        {{ t('encounters.pawns.noneAvailable') }}
      </div>
      <QList v-else class="q-pa-none">
        <QItem v-for="pawn in allPawns" :key="pawn.id">
          <QItemSection>
            {{ pawn.name }}
          </QItemSection>
          <QItemSection side>
            <QInput
              v-if="localPawns[pawn.id] !== undefined"
              type="number"
              class="pawn-quantity-input"
              :model-value="localPawns[pawn.id] || 1"
              :aria-label="t('common.quantity')"
              @update:model-value="
                (val) =>
                  handleModalQuantityChange(
                    pawn.id,
                    parseInt(String(val ?? '')),
                  )
              "
              min="1"
              dense
              outlined
            />
          </QItemSection>
          <QItemSection side>
            <ToggleSwitch
              :model-value="localPawns[pawn.id] !== undefined"
              @update:model-value="handleModalTogglePawn(pawn.id, $event)"
            />
          </QItemSection>
        </QItem>
      </QList>
    </BaseModal>
  </div>
</template>

<style scoped>
.sidebar-tab-content {
  min-height: 0;
  overflow-y: auto;
}

.pawn-link {
  color: var(--color-text);
  text-decoration: none;
}

.pawn-link:hover {
  color: var(--color-accent);
}

.pawn-row-actions {
  gap: 0.15rem;
}

.pawn-quantity-input {
  width: 72px;
}
</style>
