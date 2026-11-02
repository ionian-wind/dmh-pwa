<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconPencil, IconTrash } from '@tabler/icons-vue';
import type { CodeLibraryPanelState, CodePiece } from './codeLibrary';

defineProps<{ state: CodeLibraryPanelState }>();

const { t } = useI18n();

function firstLine(code: string): string {
  return (
    code
      .split('\n')
      .find((line) => line.trim())
      ?.trim() ?? ''
  );
}

function load(state: CodeLibraryPanelState, piece: CodePiece) {
  state.onLoad(piece);
}
</script>

<template>
  <div class="q-pa-md code-library-panel full-height column">
    <div class="row items-center justify-between q-mb-sm">
      <div class="text-subtitle1 text-weight-medium">
        {{ t('probabilityCalculator.library.title') }}
      </div>
      <QBadge color="grey-7" outline>
        {{ state.pieces.length }}
      </QBadge>
    </div>
    <QSeparator class="q-mb-sm" />

    <div v-if="state.pieces.length === 0" class="text-caption text-grey-7">
      {{ t('probabilityCalculator.library.empty') }}
    </div>

    <div class="code-library-list col">
      <div
        v-for="piece in state.pieces"
        :key="piece.id"
        class="code-library-item"
        :class="{ 'is-selected': state.selectedId === piece.id }"
        @click="load(state, piece)"
      >
        <QCheckbox
          v-model="piece.include"
          dense
          size="sm"
          class="code-library-checkbox"
          :title="t('probabilityCalculator.library.include')"
          @click.stop
        />
        <div class="col min-width-0">
          <div class="text-body2 ellipsis">{{ piece.name }}</div>
          <div class="text-caption text-grey-7 ellipsis">
            {{ firstLine(piece.code) }}
          </div>
        </div>
        <QBtn
          flat
          dense
          round
          :title="t('probabilityCalculator.library.rename')"
          :aria-label="t('probabilityCalculator.library.rename')"
          @click.stop="state.onRename(piece)"
        >
          <IconPencil :size="16" />
        </QBtn>
        <QBtn
          flat
          dense
          round
          :title="t('probabilityCalculator.library.delete')"
          :aria-label="t('probabilityCalculator.library.delete')"
          @click.stop="state.onDelete(piece)"
        >
          <IconTrash :size="16" />
        </QBtn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-library-panel {
  min-height: 0;
}

.code-library-list {
  overflow-y: auto;
}

.code-library-item {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 4px 6px 2px;
  border-radius: 6px;
  cursor: pointer;
}

.code-library-item:hover {
  background: var(--q-grey-2, #f5f5f5);
}

.code-library-item.is-selected {
  background: color-mix(in srgb, var(--q-primary, #3f51b5) 12%, transparent);
}

.code-library-checkbox {
  flex: none;
}

.min-width-0 {
  min-width: 0;
}
</style>
