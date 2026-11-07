<template>
  <div
    ref="rootEl"
    class="milkdown-view"
    @click.capture="handleLinkClick"
    @pointerdown.capture="handleTaskPointerDown"
  >
    <MilkdownProvider>
      <MilkdownEditor
        ref="editorRef"
        :model-value="content"
        current-entity-type=""
        current-entity-id=""
        readonly
        @ready="handleReady"
      />
    </MilkdownProvider>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { MilkdownProvider } from '@milkdown/vue';
import { useRouter } from 'vue-router';
import { nanoid } from 'nanoid';
import MilkdownEditor from './MilkdownEditor.vue';
import { useModalState } from '@/composables/useModalState';
import { scrollToHeading } from '@/utils/scrollToHeading';
import { featureLinkKinds } from 'virtual:feature-links';

const props = defineProps<{
  content: string;
  anchorMap?: Set<string>;
  enableMentionModal?: boolean;
  taskCheckboxEnabled?: boolean;
  scrollToAnchor?: (id: string, heading?: HTMLElement) => void;
}>();

const emit = defineEmits(['update:content', 'toc-update']);

const router = useRouter();
const { openMentionModal } = useModalState();
const rootEl = ref<HTMLElement | null>(null);
const editorRef = ref<InstanceType<typeof MilkdownEditor> | null>(null);

const entityStores = Object.fromEntries(
  featureLinkKinds.map((option) => [option.kind, option.useStore()]),
);
const enabledKinds = new Set(featureLinkKinds.map((option) => option.kind));

function getEntity(kind: string, id: string) {
  return entityStores[kind]?.getById?.(id) ?? null;
}

function handleReady() {
  emit('toc-update', editorRef.value?.getToc?.() ?? []);
}

function navigate(href: string) {
  history.pushState(history.state, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function findAnchor(kind: string, id: string) {
  if (!rootEl.value) return null;
  const prefixed = rootEl.value.querySelector(
    `#${CSS.escape(`${kind}-${id}`)}`,
  );
  if (prefixed) return prefixed as HTMLElement;
  return rootEl.value.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
}

function handleLinkClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const tagLink = target.closest('.tag-link') as HTMLElement | null;
  if (tagLink) {
    const href =
      tagLink.getAttribute('href') ||
      (tagLink.getAttribute('data-tag')
        ? `/notes?tag=${encodeURIComponent(
            tagLink.getAttribute('data-tag') as string,
          )}`
        : '');
    if (href) {
      event.preventDefault();
      navigate(href);
    }
    return;
  }

  const disabledLink = target.closest('.disabled-internal-link');
  if (disabledLink) {
    event.preventDefault();
    return;
  }

  const link = target.closest('.internal-link') as HTMLAnchorElement | null;
  if (!link) {
    const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (/^(https?:)?\/\//.test(href)) {
      event.preventDefault();
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    }
    return;
  }

  const kind = link.getAttribute('data-kind');
  const id = link.getAttribute('data-id');
  const href = link.getAttribute('href');

  if (!kind || !id || !enabledKinds.has(kind)) {
    event.preventDefault();
    return;
  }

  const anchorMap = props.anchorMap ?? new Set<string>();
  if (anchorMap.has(id)) {
    const anchor = findAnchor(kind, id);
    if (anchor) {
      event.preventDefault();
      if (props.scrollToAnchor) {
        props.scrollToAnchor(id, anchor);
      } else {
        scrollToHeading(id, router, anchor);
      }
      return;
    }
  }

  if (props.enableMentionModal) {
    event.preventDefault();
    openMentionModal('markdown-modal-' + nanoid(), getEntity(kind, id), kind);
    return;
  }

  if (href) {
    event.preventDefault();
    navigate(href);
  }
}

function getTaskLineIndexes(markdown: string): number[] {
  const lines = markdown.split(/\r?\n/);
  const indexes: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*[-*+]\s*\[([ xX])\]/.test(lines[index])) {
      indexes.push(index);
    }
  }
  return indexes;
}

function handleTaskPointerDown(event: PointerEvent) {
  if (!props.taskCheckboxEnabled) return;
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const label = target.closest('.label-wrapper');
  if (!label) return;
  const icon = label.querySelector('.label');
  const className = icon?.getAttribute('class') ?? '';
  if (!className.includes('checked') && !className.includes('unchecked')) {
    return;
  }

  const listItem = target.closest('li.list-item, li[data-item-type="task"]');
  if (!listItem || !rootEl.value) return;

  const taskItems = Array.from(
    rootEl.value.querySelectorAll('li.list-item, li[data-item-type="task"]'),
  ).filter((item) => {
    const itemClass = item.querySelector('.label')?.getAttribute('class');
    return itemClass?.includes('checked') || itemClass?.includes('unchecked');
  });
  const taskIndex = taskItems.indexOf(listItem as HTMLElement);
  if (taskIndex === -1) return;

  const lines = props.content.split(/\r?\n/);
  const lineIndex = getTaskLineIndexes(props.content)[taskIndex];
  if (lineIndex === undefined) return;

  lines[lineIndex] = lines[lineIndex].replace(
    /^(\s*[-*+]\s*\[)([ xX])(\])/,
    (_match, prefix, mark, suffix) =>
      `${prefix}${mark.toLowerCase() === 'x' ? ' ' : 'x'}${suffix}`,
  );

  event.preventDefault();
  event.stopPropagation();
  emit('update:content', lines.join('\n'));
}

onMounted(async () => {
  await Promise.all(featureLinkKinds.map((option) => option.useStore().load()));
});

defineExpose({
  getToc: () => editorRef.value?.getToc?.() ?? [],
  scrollToAnchor: (anchorId: string) => {
    const target = document.getElementById(anchorId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
});
</script>

<style scoped>
.milkdown-view :deep(.milkdown) {
  background: transparent;
}

.milkdown-view :deep(.milkdown .ProseMirror) {
  padding: 0;
  min-height: 0;
}

.milkdown-view :deep(.milkdown .ProseMirror:focus) {
  outline: none;
}

.milkdown-view :deep(.tag-link) {
  color: var(--crepe-color-primary);
  text-decoration: underline;
  cursor: pointer;
}

.milkdown-view :deep(.disabled-internal-link) {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
