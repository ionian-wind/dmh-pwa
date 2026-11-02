<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconCodeblock, IconPencil, IconTrash } from '@tabler/icons-vue';
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

    <QList class="code-library-list col q-py-sm">
      <QItem
        v-for="piece in state.pieces"
        :key="piece.id"
        clickable
        class="code-library-item q-mx-sm q-mb-sm q-pa-sm bg-white rounded-borders"
        :class="{ 'is-selected': state.selectedId === piece.id }"
        :style="{ borderLeft: '4px solid var(--color-primary)' }"
        @click="load(state, piece)"
        @keydown.enter="load(state, piece)"
      >
        <QItemSection>
          <div class="row items-center q-gutter-xs text-weight-bold">
            <QCheckbox
              v-model="piece.include"
              dense
              size="sm"
              class="code-library-checkbox"
              :title="t('probabilityCalculator.library.include')"
              @click.stop
            />
            <IconCodeblock :size="16" class="text-primary" aria-hidden="true" />
            <span class="ellipsis">{{ piece.name }}</span>
          </div>
          <div class="text-caption text-grey-7 ellipsis">
            {{ firstLine(piece.code) }}
          </div>
        </QItemSection>

        <QItemSection side class="row items-center">
          <QBtn
            flat
            dense
            round
            size="sm"
            color="positive"
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
            size="sm"
            color="negative"
            :title="t('probabilityCalculator.library.delete')"
            :aria-label="t('probabilityCalculator.library.delete')"
            @click.stop="state.onDelete(piece)"
          >
            <IconTrash :size="16" />
          </QBtn>
        </QItemSection>
      </QItem>
    </QList>
  </div>
</template>

<style scoped>
.code-library-panel {
  min-height: 0;
}

.code-library-list {
  overflow-y: auto;
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
