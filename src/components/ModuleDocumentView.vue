<script setup lang="ts">
import type { ModuleTreeNode, Note } from '@/types';
import { parseMarkdown } from '@/utils/markdownParser';
import { ref, onMounted, onUnmounted } from 'vue';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import BaseModal from '@/components/common/BaseModal.vue';

const props = defineProps<{
  noteTree: ModuleTreeNode[];
  notes: Note[];
}>();

const showModal = ref(false);
const modalEntity = ref<any>(null);
const modalKind = ref<string>('');

function findNotes(noteIds: string[]): Note[] {
  return noteIds
    .map(id => props.notes.find(n => n.id === id))
    .filter((n): n is Note => !!n);
}

function buildMarkdown(nodes: ModuleTreeNode[], depth = 1): string {
  let md = '';
  for (const node of nodes) {
    if (node.title) {
      md += `${'#'.repeat(depth + 1)} ${node.title}\n\n`;
    }
    const nodeNotes = findNotes(node.notes);
    for (const note of nodeNotes) {
      if (note.title) {
        md += `${'#'.repeat(depth + 2)} ${note.title}\n\n`;
      }
      if (note.content) {
        md += note.content + '\n\n';
      }
    }
    if (node.children && node.children.length > 0) {
      md += buildMarkdown(node.children, depth + 1);
    }
  }
  return md;
}

const combinedMarkdown = buildMarkdown(props.noteTree);

const contentRef = ref<HTMLElement | null>(null);

function getEntity(kind: string, id: string) {
  switch (kind) {
    case 'note': return useNoteStore().getNoteById(id);
    case 'module': return useModuleStore().getModuleById(id);
    case 'party': return usePartyStore().getPartyById(id);
    case 'monster': return useMonsterStore().getMonsterById(id);
    case 'encounter': return useEncounterStore().getEncounterById(id);
    default: return null;
  }
}

function handleMentionClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.classList.contains('internal-link')) {
    e.preventDefault();
    // Extract kind and id from href
    const href = target.getAttribute('href');
    if (!href) return;
    const match = href.match(/\/(notes|modules|parties|monsters|encounters)\/(.+)$/);
    if (!match) return;
    let kind = match[1];
    let id = match[2];
    // Normalize kind
    if (kind === 'modules') kind = 'module';
    if (kind === 'parties') kind = 'party';
    if (kind === 'monsters') kind = 'monster';
    if (kind === 'encounters') kind = 'encounter';
    if (kind === 'notes') kind = 'note';
    const entity = getEntity(kind, id);
    if (entity) {
      modalEntity.value = entity;
      modalKind.value = kind;
      showModal.value = true;
    }
  }
}

onMounted(() => {
  if (contentRef.value) {
    contentRef.value.addEventListener('click', handleMentionClick);
  }
});
onUnmounted(() => {
  if (contentRef.value) {
    contentRef.value.removeEventListener('click', handleMentionClick);
  }
});
</script>

<template>
  <div class="module-document-view">
    <div class="document-markdown" ref="contentRef" v-html="parseMarkdown(combinedMarkdown)"></div>
    <BaseModal :isOpen="showModal" :title="modalEntity?.title || modalEntity?.name || 'Entity Details'" :showClose="true" @cancel="showModal = false">
      <template #default>
        <div v-if="modalKind === 'note'">
          <div v-html="parseMarkdown(modalEntity.content)"></div>
        </div>
        <div v-else-if="modalKind === 'module'">
          <div>{{ modalEntity.description }}</div>
        </div>
        <div v-else-if="modalKind === 'party'">
          <div />
        </div>
        <div v-else-if="modalKind === 'monster'">
          <h2>{{ modalEntity.name }}</h2>
        </div>
        <div v-else-if="modalKind === 'encounter'">
          <h2>{{ modalEntity.name }}</h2>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.module-document-view {
  padding: 0;
}
.document-markdown {
  color: var(--color-text);
  line-height: 1.6;
}
</style> 