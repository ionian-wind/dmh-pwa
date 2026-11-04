<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useNoteStore } from '@/stores/notes';
import { useJukeboxPlaylistsStore } from '@/jukebox/stores';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useJukeboxTracksStore } from '@/jukebox/stores';
import { useMapStore } from '@/maps/maps';
import { useMapLocationStore } from '@/maps/locations';
import { useConfigStore } from '@/utils/configStore';
import { useBookmarkStore } from '@/stores/bookmarks';
import type { Module, Bookmark } from '@/types';
import type { JukeboxPlaylist, JukeboxTrack } from '@/jukebox/types';
import ModuleEditor from '@/modules/ModuleEditor.vue';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import Mentions from '@/components/common/Mentions.vue';
import TableOfContents from '@/components/common/TableOfContents.vue';
import { useMentionsStore } from '@/utils/storage';
import TabGroup from '@/components/common/TabGroup.vue';
import PartyCard from '@/parties/PartyCard.vue';
import MonsterCard from '@/monsters/MonsterCard.vue';
import EncounterCard from '@/encounters/EncounterCard.vue';
import NoteCard from '@/notes/NoteCard.vue';
import JukeboxPlaylistCard from '@/jukebox/components/JukeboxPlaylistCard.vue';
import MapCard from '@/maps/components/MapCard.vue';
import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';
import LocationCard from '@/maps/components/LocationCard.vue';
import type { MapEntity, MapLocation } from '@/maps/types';
import { useI18n } from 'vue-i18n';
import Button from '@/components/form/Button.vue';
import ModuleDocumentTree from '@/modules/ModuleDocumentTree.vue';
import ModuleDocumentView from '@/modules/ModuleDocumentView.vue';
import JSZip from 'jszip';
import { cropTitle } from '@/utils/cropTitle';
import BaseModal from '@/components/common/BaseModal.vue';
import { confirm } from '@/dialogs';
import {
  IconDownload,
  IconBookmark,
  IconPencil,
  IconTrash,
} from '@tabler/icons-vue';
import { debug } from '@/utils/debug';

interface TOCItem {
  id: string;
  title: string;
  level: number;
  anchorId: string;
}

const route = useRoute();
const router = useRouter();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();
const noteStore = useNoteStore();
const playlistsStore = useJukeboxPlaylistsStore();
const mapStore = useMapStore();
const locationStore = useMapLocationStore();
const tracksStore = useJukeboxTracksStore();
const configStore = useConfigStore();
const mentionsStore = useMentionsStore();
const bookmarkStore = useBookmarkStore();
const { t } = useI18n();

const showEditor = ref(false);
const tocItems = ref<TOCItem[]>([]);
const isLoaded = computed(() => moduleStore.isLoaded);
const module = computed(() => moduleStore.getById(route.params.id as string));
const loading = computed(() => !isLoaded.value);
const notFound = computed(() => isLoaded.value && !module.value);

const moduleParties = computed(() =>
  partyStore.items.filter((party) =>
    party.moduleIds?.includes(route.params.id as string),
  ),
);

const moduleMonsters = computed(() =>
  monsterStore.items.filter((monster) =>
    monster.moduleIds?.includes(route.params.id as string),
  ),
);

const moduleEncounters = computed(() =>
  encounterStore.items.filter(
    (encounter) => encounter.moduleId === route.params.id,
  ),
);

const moduleNotes = computed(() => {
  return noteStore.items.filter(
    (note) => note.moduleId === route.params.id && note.hidden === false,
  );
});

const modulePlaylists = computed(() =>
  playlistsStore.items.value.filter((playlist) =>
    playlist.moduleIds?.includes(route.params.id as string),
  ),
);

const moduleMaps = computed(() =>
  mapStore.items.filter((map) =>
    map.entities?.some(
      (entity) =>
        entity.kind === 'module' && entity.id === (route.params.id as string),
    ),
  ),
);

const moduleLocations = computed(() =>
  locationStore.items.filter((location) =>
    location.entities?.some(
      (entity) =>
        entity.kind === 'module' && entity.id === (route.params.id as string),
    ),
  ),
);

function moduleMapProps(map: MapEntity) {
  return {
    map,
    linkedLocation: map.locationId
      ? (locationStore.getById(map.locationId) ?? null)
      : null,
    onView: () => router.push(`/maps/${map.id}`),
    onEdit: () => router.push(`/maps/${map.id}`),
    onDelete: () => undefined,
    onOpenLocation: (locationId: string) =>
      router.push(`/locations/${locationId}`),
  };
}

function moduleLocationProps(location: MapLocation) {
  return {
    location,
    linkedMap:
      mapStore.items.find((map) => map.locationId === location.id) ?? null,
    onView: () => router.push(`/locations/${location.id}`),
    onEdit: () => router.push(`/locations/${location.id}`),
    onDelete: () => undefined,
    onOpenMap: (mapId: string) => router.push(`/maps/${mapId}`),
  };
}

const mentionedEntities = computed(() => {
  if (!module.value) return [];
  return mentionsStore.getLinks({ kind: 'module', id: module.value.id });
});
const mentionedInEntities = computed(() => {
  if (!module.value) return [];
  return mentionsStore.getBacklinks({ kind: 'module', id: module.value.id });
});

const moduleBookmarks = computed(() => {
  if (!module.value || !module.value.id) return [];
  return bookmarkStore.items.filter((b) => b.moduleId === module.value!.id);
});

const entityTabs = computed(() => [
  { id: 'document', label: t('moduleView.book') },
  { id: 'maps', label: t('maps.title') },
  { id: 'locations', label: t('maps.locations') },
  { id: 'parties', label: t('navigation.parties') },
  { id: 'monsters', label: t('navigation.monsters') },
  { id: 'encounters', label: t('navigation.encounters') },
  { id: 'notes', label: t('navigation.notes') },
  { id: 'playlists', label: t('moduleView.playlists') },
  { id: 'noteTree', label: t('moduleView.bookTree') },
]);

const activeTab = ref('document');
const sidePanelTab = ref('toc');
const moduleDocumentViewRef = ref<any>(null);
const activeAnchorId = ref<string | null>(null);
const editingBookmark = ref<Bookmark | null>(null);
const editingTitle = ref('');

const playerStore = useJukeboxPlayerStore();

onMounted(async () => {
  await Promise.all([
    moduleStore.load(),
    partyStore.load(),
    monsterStore.load(),
    encounterStore.load(),
    noteStore.load(),
    playlistsStore.load(),
    tracksStore.load(),
    mentionsStore.load(),
    bookmarkStore.load(),
    mapStore.load(),
    locationStore.load(),
  ]);
  // Listen for hash changes
  window.addEventListener('hashchange', handleHashChange);

  // Handle initial hash navigation
  handleHashChange();
});

function handleHashChange() {
  if (activeTab.value !== 'document') return;
  const anchorId = window.location.hash.replace(/^#/, '');
  if (anchorId) {
    debug({ handleHashChange: anchorId });
    scrollToBookmark(anchorId);
  }
}

onUnmounted(() => {
  window.removeEventListener('hashchange', handleHashChange);
});

function updateModuleFromStore() {
  // No assignments to computed properties! Let them update automatically.
}

// Watch for both route changes, items changes, and isLoaded
watch(
  [() => route.params.id, () => moduleStore.items, () => moduleStore.isLoaded],
  updateModuleFromStore,
  { immediate: true },
);

const handleSubmit = async (
  updatedModule: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  if (!module.value) return;
  await moduleStore.update(module.value.id, updatedModule);
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const handleDelete = async () => {
  if (!module.value) return false;
  if (
    !(await confirm(t('common.confirmDelete', { title: module.value.name })))
  ) {
    return false;
  }
  await moduleStore.remove(module.value.id);
  return true;
};

// Computed properties for BaseEntityTabView
const moduleTitle = computed(() => module.value?.name || '');
const moduleSubtitle = computed(() => module.value?.description || '');

function handleSaveNoteTree(newTree: any) {
  debug('[ModuleView] Saving tree', newTree);
  if (!module.value) return;
  moduleStore.update(module.value.id, { ...module.value, noteTree: newTree });
}

function handlePlayPlaylist(playlist: JukeboxPlaylist) {
  // TODO: implement
}

function handleTOCUpdate(toc: TOCItem[]) {
  tocItems.value = toc;
}

function scrollToBookmark(anchorId: string) {
  // Try to use the exposed scrollToAnchor method if available
  if (
    moduleDocumentViewRef.value &&
    typeof moduleDocumentViewRef.value.scrollToAnchor === 'function'
  ) {
    moduleDocumentViewRef.value.scrollToAnchor(anchorId);
  }
}

function handleActiveAnchorId(anchorId: string) {
  activeAnchorId.value = anchorId;
}

async function handleExportModule() {
  if (!module.value) return;
  // Gather module data
  const moduleId = module.value.id;
  const moduleNotes = noteStore.items.filter(
    (note) => note.moduleId === moduleId,
  );
  const tree = module.value.noteTree || [];

  // Prepare module.json (match markdown-to-json.js structure)
  const moduleJson = {
    id: module.value.id,
    name: module.value.name,
    createdAt: module.value.createdAt,
    updatedAt: module.value.updatedAt,
    noteTree: tree,
  };

  // Prepare tree.json
  const treeJson = tree;

  // Prepare notes/*.json
  const notes = moduleNotes.map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    contentType: note.contentType ?? 'text',
    typeId: note.typeId || null,
    tags: note.tags || [],
    moduleId: note.moduleId,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    hidden: note.hidden,
  }));

  // Prepare summary.json
  const summary = {
    moduleName: module.value.name,
    moduleId: module.value.id,
    totalSections: notes.length,
    totalNotes: notes.length,
    generatedAt: new Date().toISOString(),
  };

  // Create zip
  const zip = new JSZip();
  zip.file('module.json', JSON.stringify(moduleJson, null, 2));
  zip.file('tree.json', JSON.stringify(treeJson, null, 2));
  const notesFolder = zip.folder('notes');
  if (notesFolder) {
    for (const note of notes) {
      notesFolder.file(`${note.id}.json`, JSON.stringify(note, null, 2));
    }
  }
  zip.file('summary.json', JSON.stringify(summary, null, 2));

  // Generate zip and trigger download
  const zipBuffer = await zip.generateAsync({ type: 'blob' });
  const zipFileName = `${module.value.name.replace(/[^a-zA-Z0-9]/g, '_')}_module.zip`;
  const url = URL.createObjectURL(zipBuffer);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function openEditBookmark(bookmark: Bookmark) {
  editingBookmark.value = bookmark;
  editingTitle.value = bookmark.title;
}
function closeEditBookmark() {
  editingBookmark.value = null;
  editingTitle.value = '';
}
async function saveEditBookmark() {
  if (editingBookmark.value) {
    await bookmarkStore.update(editingBookmark.value.id, {
      title: editingTitle.value,
    });
    closeEditBookmark();
  }
}

async function handleEditorDelete() {
  if (await handleDelete()) {
    showEditor.value = false;
    await router.push('/modules');
  }
}
</script>

<template>
  <div>
    <BaseEntityTabView
      :entity="module"
      entity-name="modules.title"
      list-route="/modules"
      :on-delete="handleDelete"
      :on-edit="() => (showEditor = true)"
      :is-editing="showEditor"
      :title="moduleTitle"
      :subtitle="moduleSubtitle"
      :not-found="notFound"
      :loading="loading"
      :tabs="entityTabs"
      v-model="activeTab"
    >
      <template #actions>
        <Button
          @click="handleExportModule"
          variant="success"
          :title="t('common.export')"
        >
          <IconDownload />
        </Button>
      </template>
      <template #document>
        <ModuleDocumentView
          ref="moduleDocumentViewRef"
          v-if="module && module.noteTree && module.noteTree.length > 0"
          :module-id="module?.id || ''"
          :note-tree="module.noteTree"
          @toc-update="handleTOCUpdate"
          @active-anchor-id="handleActiveAnchorId"
        />
        <div v-else class="empty-state">
          <p>{{ t('moduleView.noDocument') }}</p>
        </div>
      </template>
      <template #maps>
        <div
          v-if="moduleMaps.length === 0"
          class="q-pa-md text-grey text-center q-mt-xl"
        >
          {{ t('moduleView.noMaps') }}
        </div>
        <div v-else class="row q-gutter-md">
          <div
            v-for="map in moduleMaps"
            :key="map.id"
            class="col-12 col-sm-6 col-md-4 col-lg-3"
          >
            <MapCard v-bind="moduleMapProps(map)" />
          </div>
        </div>
      </template>
      <template #locations>
        <div
          v-if="moduleLocations.length === 0"
          class="q-pa-md text-grey text-center q-mt-xl"
        >
          {{ t('moduleView.noLocations') }}
        </div>
        <div v-else class="row q-gutter-md">
          <div
            v-for="location in moduleLocations"
            :key="location.id"
            class="col-12 col-sm-6 col-md-4 col-lg-3"
          >
            <LocationCard v-bind="moduleLocationProps(location)" />
          </div>
        </div>
      </template>
      <template #parties>
        <div
          v-if="moduleParties.length === 0"
          class="empty-state q-pa-md text-grey text-center q-mt-xl"
        >
          {{ t('moduleView.noParties') }}
        </div>
        <div v-else class="content-grid">
          <PartyCard
            v-for="party in moduleParties"
            :key="party.id"
            :party="party"
          />
        </div>
      </template>
      <template #monsters>
        <div
          v-if="moduleMonsters.length === 0"
          class="q-pa-md text-grey text-center q-mt-xl"
        >
          {{ t('moduleView.noMonsters') }}
        </div>
        <div v-else class="row q-gutter-md">
          <div
            v-for="monster in moduleMonsters"
            :key="monster.id"
            class="col-12 col-sm-6 col-md-4 col-lg-3"
          >
            <MonsterCard :monster="monster" />
          </div>
        </div>
      </template>
      <template #encounters>
        <div
          v-if="moduleEncounters.length === 0"
          class="q-pa-md text-grey text-center q-mt-xl"
        >
          {{ t('moduleView.noEncounters') }}
        </div>
        <div v-else class="row q-gutter-md">
          <div
            v-for="encounter in moduleEncounters"
            :key="encounter.id"
            class="col-12 col-sm-6 col-md-4 col-lg-3"
          >
            <EncounterCard :encounter="encounter" />
          </div>
        </div>
      </template>
      <template #notes>
        <div
          v-if="moduleNotes.length === 0"
          class="q-pa-md text-grey text-center q-mt-xl"
        >
          {{ t('moduleView.noNotes') }}
        </div>
        <div v-else class="row q-gutter-md">
          <div
            v-for="note in moduleNotes"
            :key="note.id"
            class="col-12 col-sm-6 col-md-4 col-lg-3"
          >
            <NoteCard :note="note" />
          </div>
        </div>
      </template>
      <template #playlists>
        <div
          v-if="modulePlaylists.length === 0"
          class="q-pa-md text-grey text-center q-mt-xl"
        >
          {{ t('moduleView.noPlaylists') }}
        </div>
        <div v-else class="row q-gutter-md">
          <div
            v-for="playlist in modulePlaylists"
            :key="playlist.id"
            class="col-12 col-sm-6 col-md-4 col-lg-3"
          >
            <JukeboxPlaylistCard
              :playlist="playlist"
              @view="() => router.push('/jukebox')"
              @play="handlePlayPlaylist"
            />
          </div>
        </div>
      </template>
      <template #noteTree>
        <ModuleDocumentTree
          :module-id="module?.id || ''"
          :note-tree="module?.noteTree || []"
          @update:noteTree="handleSaveNoteTree"
        />
      </template>
      <template #editor>
        <ModuleEditor
          v-if="showEditor"
          :module="module"
          :is-open="showEditor"
          @submit="handleSubmit"
          @delete="handleEditorDelete"
          @cancel="handleCancel"
        />
      </template>
      <template #sidepanel>
        <div v-if="activeTab === 'document'">
          <TabGroup
            :align="'justify'"
            :title-align="'center'"
            :tabs="[
              { id: 'toc', label: t('common.tableOfContents') },
              { id: 'bookmarks', label: t('common.bookmarks') },
            ]"
            v-model="sidePanelTab"
            size="sm"
          >
            <template #default>
              <div v-show="sidePanelTab === 'toc'">
                <TableOfContents
                  :items="tocItems"
                  :active-anchor-id="activeAnchorId"
                  @item-click="scrollToBookmark"
                />
              </div>
              <div v-show="sidePanelTab === 'bookmarks'">
                <div
                  v-if="moduleBookmarks.length === 0"
                  class="q-pa-md text-grey text-center q-mt-xl"
                >
                  {{ t('common.noBookmarks') }}
                </div>
                <ul v-else class="bookmark-list">
                  <div
                    v-for="bookmark in moduleBookmarks"
                    :key="bookmark.id"
                    class="bookmark-list-row"
                  >
                    <span
                      class="bookmark-link"
                      @click="scrollToBookmark(bookmark.noteId)"
                    >
                      <IconBookmark />
                      {{
                        cropTitle(
                          bookmark.title ||
                            noteStore.getById(bookmark.noteId)?.title ||
                            t('common.untitled'),
                        )
                      }}
                    </span>
                    <Button
                      variant="light"
                      size="small"
                      class="bookmark-edit-btn"
                      :title="t('common.editBookmark')"
                      @click.stop.prevent="openEditBookmark(bookmark)"
                    >
                      <IconPencil />
                    </Button>
                    <Button
                      variant="light"
                      size="small"
                      class="bookmark-delete-btn"
                      :title="t('common.deleteBookmark')"
                      @click.stop.prevent="
                        bookmarkStore.removeBookmark(
                          bookmark.moduleId,
                          bookmark.noteId,
                        )
                      "
                    >
                      <IconTrash />
                    </Button>
                  </div>
                </ul>
              </div>
            </template>
          </TabGroup>
        </div>
        <div v-else-if="activeTab !== 'document'">
          <Mentions
            :title="t('common.mentions')"
            :entities="mentionedEntities"
          />
          <Mentions
            :title="t('common.mentionedIn')"
            :entities="mentionedInEntities"
          />
        </div>
        <QSeparator class="q-my-sm" />
        <EntityScenesPanel
          v-if="module"
          entity-type="module"
          :entity-id="module.id"
        />
      </template>
    </BaseEntityTabView>

    <!-- Edit Bookmark Modal -->
    <BaseModal
      v-if="editingBookmark"
      :isOpen="!!editingBookmark"
      modalId="edit-bookmark-modal"
      :title="t('common.editBookmark')"
      :showSubmit="true"
      :showCancel="true"
      @update:isOpen="
        (val: boolean) => {
          if (!val) closeEditBookmark();
        }
      "
      @submit="saveEditBookmark"
      @cancel="closeEditBookmark"
    >
      <label>
        {{ t('common.title') }}:
        <QInput
          dense
          outlined
          v-model="editingTitle"
          type="text"
          class="modal-input"
        />
      </label>
    </BaseModal>
  </div>
</template>

<style scoped>
/* Removed .content-grid and .empty-state. Use Quasar classes. */
</style>
