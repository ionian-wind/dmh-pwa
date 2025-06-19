<script setup lang="ts">
import type { ModuleTreeNode, Note } from '@/types';
import { parseMarkdown } from '@/utils/markdownParser';
import { ref, onMounted, onUnmounted, computed } from 'vue';
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

const modalStack = ref<{ entity: any, kind: string }[]>([]);
const modalContentRef = ref<HTMLElement | null>(null);

function findNotes(noteIds: string[]): Note[] {
  return noteIds
    .map(id => props.notes.find(n => n.id === id))
    .filter((n): n is Note => !!n);
}

function buildMarkdown(nodes: ModuleTreeNode[], depth = 1): string {
  let md = '';
  for (const node of nodes) {
    if (node.title) {
      md += `${'#'.repeat(depth + 1)} ${node.title} ${node.anchorId ? ` {#${node.anchorId}}` : ''}\n\n`;
    }
    const nodeNotes = findNotes(node.notes);
    for (const note of nodeNotes) {
      if (note.title) {
        md += `${'#'.repeat(depth + 2)} ${note.title}${node.noteAnchors && node.noteAnchors[note.id] ? ` {#${node.noteAnchors[note.id]}}` : ''}\n\n`;
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

const combinedMarkdown = computed(() => buildMarkdown(props.noteTree));

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

// Build a flat map of noteId to anchorId for all notes in the module tree
function buildNoteAnchorMap(nodes: ModuleTreeNode[]): Record<string, string> {
  const map: Record<string, string> = {};
  function traverse(nodes: ModuleTreeNode[]) {
    for (const node of nodes) {
      if (node.noteAnchors) {
        for (const [noteId, anchorId] of Object.entries(node.noteAnchors)) {
          map[noteId] = anchorId;
        }
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return map;
}

const noteAnchorMap = computed(() => buildNoteAnchorMap(props.noteTree));

function globalMentionClickHandler(e: MouseEvent) {
  const link = (e.target as HTMLElement).closest('.internal-link') as HTMLAnchorElement | null;
  if (link) {
    e.preventDefault();
    const kind = link.getAttribute('data-kind');
    const id = link.getAttribute('data-id');
    if (!kind || !id) return;
    if (kind === 'note' && modalStack.value.length === 0) {
      const anchorId = noteAnchorMap.value[id];
      if (anchorId) {
        const anchor = document.getElementById(anchorId);
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (window.location.hash !== `#${anchorId}` && history.pushState) {
            history.pushState(null, '', `#${anchorId}`);
          }
        }
        return;
      }
    }
    const entity = getEntity(kind, id);
    if (entity) {
      modalStack.value.push({ entity, kind });
    }
  }
}

onMounted(() => {
  document.addEventListener('click', globalMentionClickHandler, true);
});
onUnmounted(() => {
  document.removeEventListener('click', globalMentionClickHandler, true);
});

const showModal = computed(() => modalStack.value.length > 0);
const modalEntity = computed(() => modalStack.value.length > 0 ? modalStack.value[modalStack.value.length - 1].entity : null);
const modalKind = computed(() => modalStack.value.length > 0 ? modalStack.value[modalStack.value.length - 1].kind : '');

function closeTopModal() {
  if (modalStack.value.length > 0) {
    modalStack.value.pop();
  }
}
</script>

<template>
  <div class="module-document-view">
    <div class="document-markdown" ref="contentRef" v-html="parseMarkdown(combinedMarkdown)"></div>
    <BaseModal :isOpen="showModal" :title="modalEntity?.title || modalEntity?.name || 'Entity Details'" :showClose="true" modalId="module-document-modal" @cancel="closeTopModal">
      <template #default>
        <div v-if="modalKind === 'note'">
          <div ref="modalContentRef" v-html="parseMarkdown(modalEntity.content)"></div>
        </div>
        <div v-else-if="modalKind === 'module'">
          <div ref="modalContentRef">{{ modalEntity.description }}</div>
        </div>
        <div v-else-if="modalKind === 'party'">
          <div ref="modalContentRef" />
        </div>
        <div v-else-if="modalKind === 'monster'">
          <h2 ref="modalContentRef">{{ modalEntity.name }}</h2>
        </div>
        <div v-else-if="modalKind === 'encounter'">
          <h2 ref="modalContentRef">{{ modalEntity.name }}</h2>
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
