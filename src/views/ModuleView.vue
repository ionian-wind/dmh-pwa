<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useNoteStore } from '@/stores/notes';
import { useJukeboxPlaylistsStore } from '@/jukebox/stores';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useJukeboxTracksStore } from '@/jukebox/stores';
import { useConfigStore } from '@/utils/configStore';
import { useBookmarkStore } from '@/stores/bookmarks';
import type { Module } from '@/types';
import type { JukeboxPlaylist, JukeboxTrack } from '@/jukebox/types';
import ModuleEditor from '@/components/ModuleEditor.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Mentions from '@/components/common/Mentions.vue';
import TableOfContents from '@/components/common/TableOfContents.vue';
import { useMentionsStore } from '@/utils/storage';
import TabGroup from '@/components/common/TabGroup.vue';
import TabPanel from '@/components/common/TabPanel.vue';
import PartyCard from '@/components/PartyCard.vue';
import MonsterCard from '@/components/MonsterCard.vue';
import EncounterCard from '@/components/EncounterCard.vue';
import NoteCard from '@/components/NoteCard.vue';
import JukeboxPlaylistCard from '@/jukebox/components/JukeboxPlaylistCard.vue';
import { useI18n } from 'vue-i18n';
import Button from '@/components/common/Button.vue';
import ModuleDocumentTree from '@/components/ModuleDocumentTree.vue';
import ModuleDocumentView from '@/components/ModuleDocumentView.vue';
import JSZip from 'jszip';
import { nanoid } from 'nanoid';

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
const playerStore = useJukeboxPlayerStore();
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
  partyStore.items.filter(party => party.moduleIds?.includes(route.params.id as string))
);

const moduleMonsters = computed(() => 
  monsterStore.items.filter(monster => monster.moduleIds?.includes(route.params.id as string))
);

const moduleEncounters = computed(() => 
  encounterStore.items.filter(encounter => encounter.moduleId === route.params.id)
);

const moduleNotes = computed(() => {
  return noteStore.items.filter(note => note.moduleId === route.params.id && note.hidden === false);
});

const modulePlaylists = computed(() => 
  playlistsStore.items.value.filter(playlist => playlist.moduleIds?.includes(route.params.id as string))
);

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
  return bookmarkStore.items.filter(b => b.moduleId === module.value!.id);
});

const entityTabs = [
  { id: 'document', label: 'Book' },
  { id: 'parties', label: 'Parties' },
  { id: 'monsters', label: 'Monsters' },
  { id: 'encounters', label: 'Encounters' },
  { id: 'notes', label: 'Notes' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'noteTree', label: 'Book Tree' },
];

const activeTab = ref('document');
const sidePanelTab = ref('toc');

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
  ]);
});

function updateModuleFromStore() {
  // No assignments to computed properties! Let them update automatically.
}

// Watch for both route changes, items changes, and isLoaded
watch([
  () => route.params.id,
  () => moduleStore.items,
  () => moduleStore.isLoaded
], updateModuleFromStore, { immediate: true });

const handleSubmit = async (updatedModule: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!module.value) return;
  await moduleStore.update(module.value.id, updatedModule);
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const handleDelete = async () => {
  if (!module.value) return;
  await moduleStore.remove(module.value.id);
};

// Computed properties for BaseEntityView
const moduleTitle = computed(() => module.value?.name || '');
const moduleSubtitle = computed(() => module.value?.description || '');

function handleSaveNoteTree(newTree: any) {
  console.log('[ModuleView] Saving tree', newTree);
  if (!module.value) return;
  moduleStore.update(module.value.id, { ...module.value, noteTree: newTree });
}

function handlePlayPlaylist(playlist: JukeboxPlaylist) {
  // Set the active playlist in config
  configStore.activePlaylistId.value = playlist.id;
  
  // Get the tracks for this playlist
  const playlistTracks = playlist.trackIds
    .map((trackId: string) => tracksStore.items.value.find(t => t.id === trackId))
    .filter((track): track is JukeboxTrack => track !== undefined);
  
  // Set the queue and start playing
  if (playlistTracks.length > 0) {
    playerStore.setQueue(playlistTracks, playlist.id);
    playerStore.playTrack(playlistTracks[0]);
  }
}

function handleTOCUpdate(toc: TOCItem[]) {
  tocItems.value = toc;
}

function scrollToBookmark(anchorId: string) {
  router.replace({ hash: '#' + anchorId });
  const el = document.getElementById(anchorId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Optionally, highlight the heading
    el.classList.add('bookmark-highlight');
    setTimeout(() => el.classList.remove('bookmark-highlight'), 1200);
  }
}

async function handleExportModule() {
  if (!module.value) return;
  // Gather module data
  const moduleId = module.value.id;
  const moduleNotes = noteStore.items.filter(note => note.moduleId === moduleId);
  const tree = module.value.noteTree || [];

  // Prepare module.json (match markdown-to-json.js structure)
  const moduleJson = {
    id: module.value.id,
    name: module.value.name,
    createdAt: module.value.createdAt,
    updatedAt: module.value.updatedAt,
    noteTree: tree
  };

  // Prepare tree.json
  const treeJson = tree;

  // Prepare notes/*.json
  const notes = moduleNotes.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    typeId: note.typeId || null,
    tags: note.tags || [],
    moduleId: note.moduleId,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    hidden: note.hidden
  }));

  // Prepare summary.json
  const summary = {
    moduleName: module.value.name,
    moduleId: module.value.id,
    totalSections: notes.length,
    totalNotes: notes.length,
    generatedAt: new Date().toISOString()
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
</script>

<template>
  <BaseEntityView
    :entity="module"
    entity-name="t('modules.title')"
    list-route="/modules"
    :on-delete="handleDelete"
    :on-edit="() => showEditor = true"
    :is-editing="showEditor"
    :title="moduleTitle"
    :subtitle="moduleSubtitle"
    :not-found="notFound"
    :loading="loading"
  >
    <template #actions>
      <Button @click="handleExportModule" variant="success" :title="t('common.export')">
        <i class="si si-download"></i>
      </Button>
    </template>
    <template #default>
      <TabGroup :tabs="entityTabs" v-model="activeTab">
        <TabPanel tab-id="document">
          <ModuleDocumentView
            v-if="module && module.noteTree && module.noteTree.length > 0"
            :module-id="module?.id || ''"
            :note-tree="module.noteTree"
            @toc-update="handleTOCUpdate"
          />
          <div v-else class="empty-state">
            <p>{{ t('moduleView.noDocument') }}</p>
          </div>
        </TabPanel>
        <TabPanel tab-id="parties">
          <div v-if="moduleParties.length === 0" class="empty-state">
            <p>{{ t('moduleView.noParties') }}</p>
          </div>
          <div v-else class="content-grid">
            <PartyCard v-for="party in moduleParties" :key="party.id" :party="party" />
          </div>
        </TabPanel>
        <TabPanel tab-id="monsters">
          <div v-if="moduleMonsters.length === 0" class="empty-state">
            <p>{{ t('moduleView.noMonsters') }}</p>
          </div>
          <div v-else class="content-grid">
            <MonsterCard v-for="monster in moduleMonsters" :key="monster.id" :monster="monster" />
          </div>
        </TabPanel>
        <TabPanel tab-id="encounters">
          <div v-if="moduleEncounters.length === 0" class="empty-state">
            <p>{{ t('moduleView.noEncounters') }}</p>
          </div>
          <div v-else class="content-grid">
            <EncounterCard v-for="encounter in moduleEncounters" :key="encounter.id" :encounter="encounter" />
          </div>
        </TabPanel>
        <TabPanel tab-id="notes">
          <div v-if="moduleNotes.length === 0" class="empty-state">
            <p>{{ t('moduleView.noNotes') }}</p>
          </div>
          <div v-else class="content-grid">
            <NoteCard v-for="note in moduleNotes" :key="note.id" :note="note" />
          </div>
        </TabPanel>
        <TabPanel tab-id="playlists">
          <div v-if="modulePlaylists.length === 0" class="empty-state">
            <p>{{ t('moduleView.noPlaylists') }}</p>
          </div>
          <div v-else class="content-grid">
            <JukeboxPlaylistCard
              v-for="playlist in modulePlaylists"
              :key="playlist.id"
              :playlist="playlist"
              @view="() => router.push('/jukebox')"
              @play="handlePlayPlaylist"
            />
          </div>
        </TabPanel>
        <TabPanel tab-id="noteTree">
          <ModuleDocumentTree
            :module-id="module?.id || ''"
            :note-tree="module?.noteTree || []"
            @update:noteTree="handleSaveNoteTree"
          />
        </TabPanel>
      </TabGroup>
    </template>
    <!-- Editor Modal -->
    <template #editor>
      <ModuleEditor
        v-if="showEditor"
        :module="module"
        :is-open="showEditor"
        @submit="handleSubmit"
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
            { id: 'bookmarks', label: t('common.bookmarks') }
          ]"
          v-model="sidePanelTab"
          size="sm"
        >
          <template #default>
            <div v-show="sidePanelTab === 'toc'">
              <TableOfContents :items="tocItems" @item-click="scrollToBookmark" />
            </div>
            <div v-show="sidePanelTab === 'bookmarks'">
              <div v-if="moduleBookmarks.length === 0" class="empty-state">{{ t('common.noBookmarks') }}</div>
              <ul v-else class="bookmark-list">
                <li v-for="bookmark in moduleBookmarks" :key="bookmark.id" class="bookmark-list-item">
                  <div class="bookmark-list-row">
                    <span class="bookmark-link" @click="scrollToBookmark(bookmark.anchorId)">
                      <i class="si si-bookmark"></i> {{ bookmark.title }}
                    </span>
                    <Button
                      variant="light"
                      size="small"
                      class="bookmark-delete-btn"
                      title="Delete bookmark"
                      @click.stop.prevent="bookmarkStore.removeBookmark(bookmark.moduleId, bookmark.anchorId)"
                    >
                      <i class="si si-trash"></i>
                    </Button>
                  </div>
                </li>
              </ul>
            </div>
          </template>
        </TabGroup>
      </div>
      <div v-else-if="activeTab !== 'document'">
        <Mentions :title="t('common.mentions')" :entities="mentionedEntities" />
        <Mentions :title="t('common.mentionedIn')" :entities="mentionedInEntities" />
      </div>
    </template>
  </BaseEntityView>
</template>

<style scoped>
.module-content {
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

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.content-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.content-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1.1rem;
}

.content-card p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  line-height: 1.4;
}

.empty-state {
  color: var(--color-text-light);
  text-align: center;
  padding: 2rem;
  font-style: italic;
}

.bookmark-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.bookmark-list-item {
  margin-bottom: 0.5rem;
}

.bookmark-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bookmark-link {
  display: flex;
  align-items: center;
  gap: 0.5em;
  color: var(--color-text);
  font-size: 0.95rem;
  padding: 0.25rem 0;
  cursor: pointer;
  border-radius: 4px;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  transition: color 0.2s, background-color 0.2s, text-decoration 0.2s;
}

.bookmark-link:hover {
  color: var(--color-success);
  text-decoration: underline;
  background: var(--color-success-alpha, #e6f9ed);
}

.bookmark-highlight {
  animation: bookmark-highlight-fade 1.2s;
  background: var(--color-success-alpha, #e6f9ed) !important;
}

@keyframes bookmark-highlight-fade {
  0% { background: var(--color-success-alpha, #e6f9ed); }
  100% { background: transparent; }
}
</style> 
