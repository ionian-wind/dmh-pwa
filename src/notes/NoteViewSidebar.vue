<script setup lang="ts">
import Mentions from '@/components/common/Mentions.vue';
import { computed, onMounted, ref } from 'vue';
import type { Note } from '@/types';
import { useI18n } from 'vue-i18n';
import { useMentionsStore } from '@/utils/storage';
import EntityGroup from '@/components/common/EntityGroup.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { IconEdit, IconEye } from '@tabler/icons-vue';

const { t } = useI18n();

const mentionsStore = useMentionsStore();
const isEditMode = ref(false);
const activeTab = ref('tags');
const tabs = computed(() => [
  { id: 'tags', label: t('tags.title') },
  { id: 'mentions', label: t('common.mentions') },
]);

const props = defineProps<{
  note: Note;
}>();

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

onMounted(() => mentionsStore.load());
</script>

<template>
  <div class="side-panel-content note-sidebar column full-height">
    <div class="note-sidebar-content col-grow q-pa-md">
      <TabGroup
        :align="'justify'"
        :title-align="'center'"
        v-model="activeTab"
        :tabs="tabs"
        size="sm"
      >
        <template #default>
          <div v-show="activeTab === 'tags'">
            <EntityGroup
              v-if="props.note.tags?.length"
              class="tags-section"
              :title="t('tags.title')"
            >
              <div class="tags">
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
            </EntityGroup>
            <div v-else class="text-caption text-grey-7 q-pa-sm">
              {{ t('tagSelector.noTags') }}
            </div>
          </div>
          <div v-show="activeTab === 'mentions'">
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
    <QList>
      <QItem class="note-mode-toggle">
        <QItemSection>
          <QBtnGroup spread class="full-width">
            <QBtn
              class="note-view-mode"
              color="primary"
              :outline="isEditMode"
              :title="t('common.viewMode')"
              :aria-label="t('common.viewMode')"
              :aria-pressed="!isEditMode"
              @click="isEditMode = false"
            >
              <IconEye :size="18" />
            </QBtn>
            <QBtn
              class="note-edit-mode"
              color="primary"
              :outline="!isEditMode"
              :title="t('common.editMode')"
              :aria-label="t('common.editMode')"
              :aria-pressed="isEditMode"
              @click="isEditMode = true"
            >
              <IconEdit :size="18" />
            </QBtn>
          </QBtnGroup>
        </QItemSection>
      </QItem>
    </QList>
  </div>
</template>

<style scoped>
.note-sidebar-content {
  min-height: 0;
  overflow-y: auto;
}
</style>
