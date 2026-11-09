<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import SidebarItem from '@/components/common/SidebarItem.vue';
import type { CodeLibraryPanelState, CodePiece } from './codeLibrary';

defineProps<{ state: CodeLibraryPanelState }>();

const { t } = useI18n();

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
      <SidebarItem
        v-for="piece in state.pieces"
        :key="piece.id"
        :title="piece.name"
        class="code-library-item"
        :class="{ 'is-selected': state.selectedId === piece.id }"
        @click="load(state, piece)"
        @keydown.enter="load(state, piece)"
      >
        <template #left>
          <QCheckbox
            v-model="piece.include"
            dense
            size="sm"
            class="code-library-checkbox"
            :title="t('probabilityCalculator.library.include')"
            @click.stop
          />
        </template>

        <template #actions>
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
            <QIcon name="tabler-pencil" size="16px" />
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
            <QIcon name="tabler-trash" size="16px" />
          </QBtn>
        </template>
      </SidebarItem>
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
