<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { parseMarkdown } from '@/utils/markdownParser';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useModalState } from '@/composables/useModalState';
import { nanoid } from 'nanoid';

const props = defineProps<{ content: string; anchorMap?: Record<string, string>; enableMentionModal?: boolean }>();
const parsed = computed(() => parseMarkdown(props.content));

const rootEl = ref<HTMLElement | null>(null);

const { openMentionModal, closeMentionModal } = useModalState();

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();

function getEntity(kind: string, id: string) {
  switch (kind) {
    case 'note': return noteStore.getNoteById(id);
    case 'module': return moduleStore.getModuleById(id);
    case 'party': return partyStore.getPartyById(id);
    case 'monster': return monsterStore.getMonsterById(id);
    case 'encounter': return encounterStore.getEncounterById(id);
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

onMounted(() => {
  if (rootEl.value) {
    rootEl.value.addEventListener('click', handleInternalLinkClick, true);
  }
  window.addEventListener('hashchange', scrollToAnchorIfNeeded);
});
</script>

<template>
  <div class="markdown-content" ref="rootEl">
    <div v-html="parsed"></div>
  </div>
</template>

<style scoped>
.markdown-content {
  font-family: var(--font-family);
  color: var(--color-text);
  line-height: 1.6;
}
</style> 