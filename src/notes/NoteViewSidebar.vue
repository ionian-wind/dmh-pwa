<script setup lang="ts">
import Mentions from '@/components/common/Mentions.vue';
import { computed, onMounted, reactive, ref } from 'vue';
import type { Bookmark, Note, NoteEditState } from '@/types';
import type { TocItem } from '@/components/common/milkdown/plugins/toc';
import { useI18n } from 'vue-i18n';
import { useMentionsStore } from '@/utils/storage';
import { useBookmarkStore } from '@/stores/bookmarks';
import { prompt } from '@/dialogs';
import TabGroup from '@/components/common/TabGroup.vue';
import TableOfContents from '@/components/common/TableOfContents.vue';
import EntityModeControls from '@/components/common/EntityModeControls.vue';
import NoteOptions from '@/notes/NoteOptions.vue';
import { downloadNote } from '@/notes/downloadNote';
import {
  IconAlertTriangle,
  IconBookmark,
  IconFileDownload,
  IconPencil,
  IconTrash,
} from '@tabler/icons-vue';

const { t } = useI18n();

const mentionsStore = useMentionsStore();
const bookmarkStore = useBookmarkStore();
const localEditState = reactive<NoteEditState>({
  isEditMode: false,
  isVisualMode: true,
  draft: null,
});
const activeTab = ref('toc');
const tabs = computed(() => [
  { id: 'toc', label: t('notes.contents') },
  { id: 'bookmarks', label: t('common.bookmarks') },
  { id: 'tags', label: t('tags.title') },
  { id: 'mentions', label: t('common.mentions') },
]);

const props = defineProps<{
  note: Note;
  editState?: NoteEditState;
  onSetEditMode?: (value: boolean) => void | Promise<void>;
  tocItems?: TocItem[];
  tocReady?: boolean;
}>();

const state = computed(() => props.editState ?? localEditState);
const optionsNote = computed(() => state.value.draft ?? props.note);
const downloadDisabled = computed(
  () => props.note?.contentType === 'draw' && !props.note?.preview,
);

const mentions = computed(() => {
  return props.note
    ? mentionsStore.getLinks({ kind: 'note', id: props.note.id })
    : [];
});

// Find notes that mention this note using the indexation store
const mentionedIn = computed(() =>
  props.note
    ? mentionsStore.getBacklinks({
        kind: 'note',
        id: props.note.id,
      })
    : [],
);

const noteBookmarks = computed(() =>
  props.note ? bookmarkStore.bookmarksFor('note', props.note.id) : [],
);

const bookmarkedAnchorIds = computed(
  () =>
    new Set(
      noteBookmarks.value.map(
        (bookmark) => bookmark.anchorId ?? bookmark.noteId,
      ),
    ),
);

const tocAnchorIds = computed(
  () => new Set((props.tocItems ?? []).map((item) => item.anchorId)),
);

function isBookmarkMissing(bookmark: Bookmark) {
  if (!props.tocReady) return false;
  return !tocAnchorIds.value.has(bookmark.anchorId ?? bookmark.noteId);
}

const missingBookmarks = computed(() =>
  noteBookmarks.value.filter(isBookmarkMissing),
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

function handleOptionsUpdate(updated: Note) {
  if (state.value.draft) {
    Object.assign(state.value.draft, updated);
  }
}

function handleDownload() {
  if (props.note && !downloadDisabled.value) {
    downloadNote(props.note);
  }
}

function scrollToAnchor(anchorId: string) {
  const target = document.getElementById(anchorId);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('highlight-anchor');
  window.setTimeout(() => target.classList.remove('highlight-anchor'), 1200);
  history.replaceState(null, '', `#${anchorId}`);
}

async function toggleBookmark(item: TocItem) {
  if (!props.note) return;
  await bookmarkStore.toggleAnchorBookmark(
    'note',
    props.note.id,
    item.anchorId,
    item.title,
  );
}

function cropTitle(title: string) {
  const normalized = title.trim();
  if (normalized.length <= 48) return normalized;
  return `${normalized.slice(0, 47).trimEnd()}…`;
}

function bookmarkLabel(bookmark: Bookmark) {
  return cropTitle(bookmark.title || t('common.untitled'));
}

async function editBookmark(bookmark: Bookmark) {
  const title = await prompt(t('common.editBookmark'), {
    title: t('common.editBookmark'),
    modelValue: bookmark.title,
  });
  if (title === null) return;
  await bookmarkStore.update(bookmark.id, { title: title.trim() });
}

async function removeBookmark(bookmark: Bookmark) {
  await bookmarkStore.remove(bookmark.id);
}

async function removeMissingBookmarks() {
  await Promise.all(
    missingBookmarks.value.map((bookmark) => bookmarkStore.remove(bookmark.id)),
  );
}

onMounted(() => {
  void mentionsStore.load();
  void bookmarkStore.load();
});
</script>

<template>
  <div class="side-panel-content note-sidebar column full-height">
    <div class="sidebar-tab-content col-grow">
      <div v-if="state.isEditMode" class="q-pa-md">
        <NoteOptions :note="optionsNote" @update:note="handleOptionsUpdate" />
      </div>

      <TabGroup
        v-else
        :align="'justify'"
        :title-align="'center'"
        v-model="activeTab"
        :tabs="tabs"
        size="sm"
      >
        <template #default>
          <div v-show="activeTab === 'toc'" class="q-pa-md">
            <TableOfContents
              v-if="props.tocItems?.length"
              :items="props.tocItems"
              show-bookmark-action
              :bookmarked-ids="bookmarkedAnchorIds"
              :bookmark-label="t('common.bookmark')"
              :remove-bookmark-label="t('common.removeBookmark')"
              @item-click="scrollToAnchor"
              @bookmark-toggle="toggleBookmark"
            />
            <div v-else class="text-caption text-grey-7">
              {{ t('common.noTableOfContents') }}
            </div>
          </div>

          <div v-show="activeTab === 'bookmarks'" class="q-pa-md">
            <div
              v-if="noteBookmarks.length === 0"
              class="text-caption text-grey-7"
            >
              {{ t('common.noBookmarks') }}
            </div>
            <div v-else>
              <QBtn
                v-if="missingBookmarks.length"
                flat
                dense
                size="sm"
                class="remove-missing-bookmarks"
                :title="t('common.removeMissingBookmarks')"
                @click="removeMissingBookmarks"
              >
                <IconAlertTriangle :size="14" />
                <span class="q-ml-xs">
                  {{ t('common.removeMissingBookmarks') }}
                </span>
              </QBtn>
              <ul class="bookmark-list">
                <li
                  v-for="bookmark in noteBookmarks"
                  :key="bookmark.id"
                  class="bookmark-row"
                  :class="{
                    'bookmark-row--missing': isBookmarkMissing(bookmark),
                  }"
                >
                  <button
                    type="button"
                    class="bookmark-link"
                    :disabled="isBookmarkMissing(bookmark)"
                    :title="
                      isBookmarkMissing(bookmark)
                        ? t('common.bookmarkMissing')
                        : bookmarkLabel(bookmark)
                    "
                    @click="
                      scrollToAnchor(bookmark.anchorId ?? bookmark.noteId)
                    "
                  >
                    <IconAlertTriangle
                      v-if="isBookmarkMissing(bookmark)"
                      :size="14"
                    />
                    <IconBookmark v-else :size="14" />
                    <span>{{ bookmarkLabel(bookmark) }}</span>
                  </button>
                  <QBtn
                    flat
                    dense
                    size="sm"
                    class="bookmark-action"
                    :title="t('common.editBookmark')"
                    :aria-label="t('common.editBookmark')"
                    @click.stop="editBookmark(bookmark)"
                  >
                    <IconPencil :size="14" />
                  </QBtn>
                  <QBtn
                    flat
                    dense
                    size="sm"
                    class="bookmark-action bookmark-delete"
                    :title="t('common.deleteBookmark')"
                    :aria-label="t('common.deleteBookmark')"
                    @click.stop="removeBookmark(bookmark)"
                  >
                    <IconTrash :size="14" />
                  </QBtn>
                </li>
              </ul>
            </div>
          </div>

          <div v-show="activeTab === 'tags'" class="q-pa-md">
            <div v-if="props.note.tags?.length" class="tags tags-section">
              <router-link
                v-for="tag in props.note.tags"
                :key="tag"
                class="tag"
                :to="{
                  path: '/notes',
                  query: { tag: encodeURIComponent(tag) },
                }"
                >#{{ tag }}</router-link
              >
            </div>
            <div v-else class="text-caption text-grey-7">
              {{ t('tagSelector.noTags') }}
            </div>
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

    <QSeparator />
    <QList v-if="!state.isEditMode">
      <QItem
        class="note-download"
        clickable
        v-ripple
        :disable="downloadDisabled"
        @click="handleDownload"
      >
        <QItemSection>{{ t('common.download') }}</QItemSection>
        <QItemSection side>
          <IconFileDownload :size="18" />
        </QItemSection>
      </QItem>
    </QList>

    <QSeparator v-if="!state.isEditMode" />
    <EntityModeControls
      :is-edit-mode="state.isEditMode"
      :is-visual-mode="state.isVisualMode"
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

.bookmark-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.bookmark-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0;
}

.bookmark-link {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.4rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.bookmark-link span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-link:hover {
  color: var(--color-accent);
  background: var(--color-background-mute);
}

.bookmark-row--missing .bookmark-link {
  color: var(--color-text-lighter);
  cursor: default;
}

.bookmark-row--missing .bookmark-link:hover {
  color: var(--color-text-lighter);
  background: transparent;
}

.remove-missing-bookmarks {
  color: var(--color-warning-dark);
  margin-bottom: 0.35rem;
}

.bookmark-action {
  color: var(--color-text-light);
}

.bookmark-delete:hover {
  color: var(--color-danger);
}
</style>
