<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { parseMarkdown } from '@/utils/markdownParser';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useModalState } from '@/composables/useModalState';
import { nanoid } from 'nanoid';

const props = defineProps<{ 
  content: string;
  anchorMap?: Record<string, string>;
  enableMentionModal?: boolean,
  taskCheckboxEnabled?: boolean
}>();

const emit = defineEmits(['update:content']);

const parsed = computed(() => parseMarkdown(props.content, { taskCheckboxEnabled: !!props.taskCheckboxEnabled }));

const rootEl = ref<HTMLElement | null>(null);

const { openMentionModal, closeMentionModal } = useModalState();

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();

function getEntity(kind: string, id: string) {
  switch (kind) {
    case 'note': return noteStore.getById(id);
    case 'module': return moduleStore.getById(id);
    case 'party': return partyStore.getById(id);
    case 'monster': return monsterStore.getById(id);
    case 'encounter': return encounterStore.getById(id);
    default: return null;
  }
}

function handleInternalLinkClick(e: MouseEvent) {
  const link = (e.target as HTMLElement).closest('.internal-link') as HTMLAnchorElement | null;
  if (!link) return;

  const kind = link.getAttribute('data-kind');
  const id = link.getAttribute('data-id');
  const href = link.getAttribute('href');
  const anchorMap = props.anchorMap || {};

  // If note link and anchor exists, scroll to anchor
  if (kind && id) {
    const anchorId = anchorMap[id];
    if (anchorId) {
      const anchor = (rootEl.value && rootEl.value.contains(link))
        ? rootEl.value.querySelector(`#${CSS.escape(anchorId)}`) as HTMLElement
        : null;
      if (anchor) {
        e.preventDefault();
        anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (window.location.hash !== `#${anchorId}` && history.pushState) {
          history.pushState(history.state, '', `#${anchorId}`);
        }
        return;
      }
    }
    // If not an anchor, open in modal ONLY if enabled
    if (props.enableMentionModal) {
      const entity = getEntity(kind, id);
      e.preventDefault();
      const modalId = 'markdown-modal-' + nanoid();
      openMentionModal(modalId, entity, kind);
      return;
    }
  }

  // Default: SPA navigation
  if (href && history.pushState) {
    e.preventDefault();
    history.pushState(history.state, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

function scrollToAnchorIfNeeded() {
  // (Optional: implement anchor scroll on hashchange if needed)
}

// Map from checkbox index to markdown line index
function getTaskLineIndexes(markdown: string): number[] {
  const lines = markdown.split(/\r?\n/);
  const indexes: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*[-*+]\s*\[([ xX])\]/.test(lines[i])) {
      indexes.push(i);
    }
  }
  return indexes;
}

function handleCheckboxChange(e: Event) {
  if (!props.taskCheckboxEnabled) return;
  const target = e.target as HTMLInputElement;
  if (!target || target.type !== 'checkbox' || !rootEl.value) return;
  // Find all checkboxes in order
  const checkboxes = Array.from(rootEl.value.querySelectorAll('input[type="checkbox"].task-list-checkbox'));
  const idx = checkboxes.indexOf(target);
  if (idx === -1) return;
  // Find the corresponding line in the markdown
  const lines = props.content.split(/\r?\n/);
  const taskIndexes = getTaskLineIndexes(props.content);
  const lineIdx = taskIndexes[idx];
  if (lineIdx === undefined) return;
  // Toggle the checkbox in the markdown
  lines[lineIdx] = lines[lineIdx].replace(/^(\s*[-*+]\s*\[)([ xX])(\])/, (m, pre, mark, post) => pre + (target.checked ? 'x' : ' ') + post);
  const newContent = lines.join('\n');
  emit('update:content', newContent);
}

onMounted(async () => {
  if (rootEl.value) {
    rootEl.value.addEventListener('click', handleInternalLinkClick, true);
    if (props.taskCheckboxEnabled) {
      rootEl.value.addEventListener('change', handleCheckboxChange, true);
    }
  }
  window.addEventListener('hashchange', scrollToAnchorIfNeeded);

  await noteStore.load();
  await moduleStore.load();
  await partyStore.load();
  await monsterStore.load();
  await encounterStore.load();
});

onUnmounted(() => {
  if (rootEl.value) {
    rootEl.value.removeEventListener('click', handleInternalLinkClick, true);
    if (props.taskCheckboxEnabled) {
      rootEl.value.removeEventListener('change', handleCheckboxChange, true);
    }
  }
  window.removeEventListener('hashchange', scrollToAnchorIfNeeded);
});

watch(() => props.taskCheckboxEnabled, (enabled) => {
  if (!rootEl.value) return;
  if (enabled) {
    rootEl.value.addEventListener('change', handleCheckboxChange, true);
  } else {
    rootEl.value.removeEventListener('change', handleCheckboxChange, true);
  }
});
</script>

<template>
  <div class="markdown-content" ref="rootEl">
    <div v-html="parsed"></div>
  </div>
</template>
