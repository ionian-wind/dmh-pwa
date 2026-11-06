<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { HelpNavNode } from './content';

defineOptions({ name: 'HelpNav' });

const props = withDefaults(
  defineProps<{
    nodes: HelpNavNode[];
    active: string;
    depth?: number;
  }>(),
  { depth: 0 },
);

const router = useRouter();

function open(node: HelpNavNode) {
  void router.push(`/help/${node.path}`);
}
</script>

<template>
  <QList dense class="help-nav">
    <template v-for="node in nodes" :key="node.path">
      <QItem
        clickable
        class="help-nav-item"
        :class="{ 'help-nav-item--active': props.active === node.path }"
        :style="{ paddingLeft: `${12 + props.depth * 14}px` }"
        @click="open(node)"
      >
        <QItemSection>{{ node.title }}</QItemSection>
      </QItem>

      <HelpNav
        v-if="node.children.length"
        :nodes="node.children"
        :active="props.active"
        :depth="props.depth + 1"
      />
    </template>
  </QList>
</template>

<style scoped>
.help-nav-item {
  border-radius: 8px;
}

.help-nav-item--active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}
</style>
