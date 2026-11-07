<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  IconAffiliate,
  IconEye,
  IconForms,
  IconHelp,
  IconMap,
  IconMapPinned,
} from '@tabler/icons-vue';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import EntityContentSurface from '@/components/common/EntityContentSurface.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import EntityModeControls from '@/components/common/EntityModeControls.vue';
import Markdown from '@/components/common/Markdown.vue';
import { alert, confirm } from '@/dialogs';
import { entityScenesPanel as EntityScenesPanel } from 'virtual:feature-entity-panels';
import LocationMapTab from '../components/LocationMapTab.vue';
import { deleteMapLocation, useMapLocationStore } from '../locations';
import { markerIconClass } from '@/utils/maps/icons';
import type { MapEntityKind, MapEntityRef, MapLocation } from '../types';
import { useEntityEditMode } from '@/composables/useEntityEditMode';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const locationStore = useMapLocationStore();

const location = computed(() =>
  locationStore.getById(String(route.params.id ?? '')),
);
const loading = computed(() => !locationStore.isLoaded);
const notFound = computed(() => locationStore.isLoaded && !location.value);
const validationError = ref<string | null>(null);
const activeTab = ref('main');
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

const { editState, setEditMode, discardDraft } = useEntityEditMode<MapLocation>(
  {
    source: location,
    clone: (source) => ({
      ...source,
      entities: (source.entities ?? []).map((entity) => ({ ...entity })),
    }),
    isDirty: (draft, source) =>
      draft.name !== source.name ||
      (draft.description ?? '') !== (source.description ?? '') ||
      !refsEqual(draft.entities, source.entities),
    onEnter: () => {
      validationError.value = null;
    },
    onDiscard: () => {
      validationError.value = null;
    },
    prepare: prepareDraft,
    save: persistDraft,
  },
);

const tabs = computed(() => [
  {
    id: 'main',
    label: editState.isEditMode ? t('common.mainEditor') : t('common.view'),
    icon: editState.isEditMode ? IconForms : IconEye,
  },
  ...(location.value?.map?.fileId
    ? [{ id: 'map', label: t('maps.mapTab'), icon: IconMap }]
    : []),
  ...(editState.isEditMode
    ? []
    : [
        {
          id: 'backlinks',
          label: t('maps.backlinks'),
          icon: IconMapPinned,
        },
      ]),
  { id: 'links', label: t('common.linkedEntities'), icon: IconAffiliate },
]);

watch(
  () => editState.isEditMode,
  (isEditing) => {
    if (isEditing && activeTab.value === 'backlinks') {
      activeTab.value = 'main';
    }
  },
);

const locationLinks = computed<MapEntityRef[]>(() => {
  const source = editState.draft ?? location.value;
  return source?.entities ?? [];
});

const draftName = computed({
  get: () => editState.draft?.name ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.name = value;
  },
});

const draftDescription = computed({
  get: () => editState.draft?.description ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.description = value;
  },
});

const linkKinds: MapEntityKind[] = [
  'note',
  'module',
  'party',
  'monster',
  'encounter',
  'character',
  'playlist',
];

function refsEqual(a: MapEntityRef[] = [], b: MapEntityRef[] = []) {
  return (
    a.length === b.length &&
    a.every(
      (ref, index) => ref.kind === b[index]?.kind && ref.id === b[index]?.id,
    )
  );
}

function setLinks(kind: MapEntityKind, links: MapEntityRef[]) {
  if (!editState.draft) return;
  editState.draft.entities = [
    ...(editState.draft.entities ?? []).filter(
      (entity) => entity.kind !== kind,
    ),
    ...links.filter((entity) => entity.kind === kind),
  ];
}

function handleDescriptionChange(description: string) {
  if (location.value) {
    void locationStore.update(location.value.id, { description });
  }
}

async function prepareDraft(draft: MapLocation): Promise<boolean> {
  if (markdownEditorRef.value?.getMarkdown) {
    draft.description = markdownEditorRef.value.getMarkdown();
  }
  if (!draft.name?.trim()) {
    await alert(t('maps.locationNameRequired'));
    return false;
  }
  validationError.value = null;
  return true;
}

async function persistDraft(draft: MapLocation): Promise<boolean> {
  if (!location.value) return false;
  try {
    await locationStore.update(location.value.id, {
      name: draft.name.trim(),
      description: draft.description,
      entities: draft.entities,
    });
  } catch (error) {
    validationError.value =
      error instanceof Error ? error.message : String(error);
    return false;
  }
  return true;
}

const headerButtons = computed(() => {
  if (!editState.isEditMode || editState.isVisualMode) return [];
  return [
    {
      color: 'primary',
      title: 'markdownEditor.formattingHelp',
      icon: IconHelp,
      href: helpHref('reference/markdown', getHelpLocale(locale.value)),
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  ];
});

const backlinkGroups = computed(() => {
  const locationId = location.value?.id;
  if (!locationId) return [];

  return locationStore.items
    .filter((entry) => entry.id !== locationId)
    .map((entry) => ({
      location: entry,
      markers: (entry.map?.markers ?? []).filter(
        (marker) => marker.locationId === locationId,
      ),
      areas: (entry.map?.areas ?? []).filter(
        (area) => area.locationId === locationId,
      ),
    }))
    .filter((group) => group.markers.length > 0 || group.areas.length > 0);
});

onMounted(async () => {
  await locationStore.load();
});

async function handleDelete() {
  if (!location.value) return false;
  if (
    !(await confirm(
      t('common.confirmDelete', {
        title: location.value.name || t('maps.untitledLocation'),
      }),
    ))
  ) {
    return false;
  }
  discardDraft();
  await deleteMapLocation(location.value.id);
  await router.push('/locations');
  return true;
}

function openLocation(locationId: string) {
  void router.push(`/locations/${locationId}`);
}
</script>

<template>
  <BaseEntityTabView
    :entity="location"
    entity-name="maps.location"
    list-route="/locations"
    :on-delete="handleDelete"
    :header-show-edit="false"
    :header-show-delete="editState.isEditMode"
    :is-editing="editState.isEditMode"
    :title="editState.isEditMode || activeTab === 'map' ? '' : location?.name"
    :not-found="notFound"
    :loading="loading"
    :header-buttons="headerButtons"
    :tabs="tabs"
    v-model="activeTab"
    fill
  >
    <template #main>
      <EntityContentSurface v-if="!editState.isEditMode">
        <Markdown
          v-if="location?.description"
          :taskCheckboxEnabled="true"
          :enableMentionModal="true"
          :content="location.description"
          @update:content="handleDescriptionChange"
        />
        <p v-else class="text-caption text-grey-7">
          {{ t('common.noDescription') }}
        </p>
      </EntityContentSurface>

      <EntityInlineEditor
        v-else
        v-model:title="draftName"
        :title-placeholder="t('maps.locationName')"
        :validation-error="validationError"
      >
        <EntityMarkdownEditor
          ref="markdownEditorRef"
          v-model="draftDescription"
          :is-visual-mode="editState.isVisualMode"
          :entity-id="editState.draft?.id || ''"
          entity-type="location"
          :placeholder="t('maps.locationDescription')"
        />
      </EntityInlineEditor>
    </template>

    <template #map>
      <LocationMapTab
        v-if="location"
        :location="location"
        :edit-state="editState"
        :on-set-edit-mode="setEditMode"
      />
      <div v-else class="q-pa-md text-caption text-grey-7">
        {{ t('maps.noMapImage') }}
      </div>
    </template>

    <template #links>
      <EntityViewLinks v-if="!editState.isEditMode" :links="locationLinks" />
      <div v-else class="column q-gutter-md">
        <EntitiesLinking
          v-for="kind in linkKinds"
          :key="kind"
          :kind="kind"
          :model-value="locationLinks"
          @update:model-value="(links) => setLinks(kind, links)"
        />
      </div>
    </template>

    <template #backlinks>
      <div class="q-pa-md">
        <div
          v-if="backlinkGroups.length === 0"
          class="text-caption text-grey-7"
        >
          {{ t('maps.noBacklinks') }}
        </div>
        <div
          v-for="(group, index) in backlinkGroups"
          :key="group.location.id"
          class="q-mb-md"
        >
          <div
            class="text-caption text-uppercase text-weight-bold text-grey-7 q-mb-xs cursor-pointer"
            @click="openLocation(group.location.id)"
          >
            {{ group.location.name || t('maps.untitledLocation') }}
          </div>
          <QList>
            <QItem
              v-for="marker in group.markers"
              :key="marker.id"
              clickable
              class="q-mb-xs bg-white rounded-borders"
              :style="{
                borderLeft: `4px solid ${marker.color || 'var(--color-accent)'}`,
              }"
              @click="openLocation(group.location.id)"
            >
              <QItemSection>
                <div class="row items-center q-gutter-xs">
                  <i
                    v-if="marker.icon"
                    :class="['ra', markerIconClass(marker.icon)]"
                    :style="{ color: marker.color }"
                    aria-hidden="true"
                  ></i>
                  <span>{{ marker.title || t('maps.untitledMarker') }}</span>
                </div>
              </QItemSection>
            </QItem>
            <QItem
              v-for="area in group.areas"
              :key="area.id"
              clickable
              class="q-mb-xs bg-white rounded-borders"
              :style="{
                borderLeft: `4px solid ${area.color || 'var(--color-accent)'}`,
              }"
              @click="openLocation(group.location.id)"
            >
              <QItemSection>
                {{ area.title || t('maps.untitledArea') }}
              </QItemSection>
            </QItem>
          </QList>
          <QSeparator
            v-if="index < backlinkGroups.length - 1"
            class="q-my-sm"
          />
        </div>
      </div>
    </template>

    <template #sidepanel>
      <div
        v-show="activeTab === 'map' && !!location?.map?.fileId"
        id="location-map-sidebar"
        class="location-map-sidebar"
      ></div>
      <div
        v-if="activeTab !== 'map' && location"
        class="side-panel-content column full-height"
      >
        <div class="sidebar-tab-content col-grow q-pa-md">
          <EntityScenesPanel
            v-if="EntityScenesPanel"
            entity-type="location"
            :entity-id="location.id"
          />
        </div>
        <QSeparator />
        <EntityModeControls
          :is-edit-mode="editState.isEditMode"
          :is-visual-mode="editState.isVisualMode"
          @update:is-edit-mode="setEditMode"
          @update:is-visual-mode="(value) => (editState.isVisualMode = value)"
        />
      </div>
    </template>
  </BaseEntityTabView>
</template>

<style scoped>
.location-map-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sidebar-tab-content {
  min-height: 0;
  overflow-y: auto;
}
:deep(.q-tab-panels),
:deep(.q-tab-panel) {
  height: 100%;
}

:deep(.q-tab-panel) {
  padding: 0;
}
</style>
