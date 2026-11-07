<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';
import { sanitizeHtmlContent } from '@/utils/markdownParser';

const props = defineProps<{
  kind: string;
  entity: any;
}>();

const { t } = useI18n();
const description = computed(() =>
  props.kind === 'encounter'
    ? sanitizeHtmlContent(props.entity?.description || '')
    : '',
);
</script>

<template>
  <div class="entity-main-content">
    <template v-if="kind === 'note'">
      <div class="note-content-surface">
        <img
          v-if="entity?.contentType === 'draw' && entity?.preview"
          :src="entity.preview"
          :alt="entity.title || ''"
          class="note-drawing-preview"
        />
        <MilkdownView
          v-else-if="entity?.contentType !== 'draw'"
          :taskCheckboxEnabled="true"
          :enableMentionModal="true"
          :content="entity?.content || ''"
        />
      </div>
    </template>

    <template v-else-if="kind === 'party'">
      <div class="q-pa-md q-gutter-md">
        <p v-if="entity?.description" class="text-body1">
          {{ entity.description }}
        </p>
      </div>
    </template>

    <template v-else-if="kind === 'monster' || kind === 'character'">
      <div class="q-pa-md q-gutter-md">
        <div v-if="entity?.notes" class="q-mb-md">
          <h2>{{ t('notes.title') }}</h2>
          <div class="q-pa-sm bg-grey-1 rounded-borders">
            <p>{{ entity.notes }}</p>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="kind === 'encounter'">
      <section class="details-section">
        <div v-html="description"></div>
      </section>
    </template>

    <template v-else-if="kind === 'location'">
      <div class="q-py-md">
        <p v-if="entity?.description" class="text-body1">
          {{ entity.description }}
        </p>
        <p v-else class="text-caption text-grey-7">
          {{ t('common.noDescription') }}
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.note-content-surface {
  min-height: 100%;
  padding: 1rem;
  border-radius: var(--border-radius);
}

.note-drawing-preview {
  width: 100%;
  max-height: 180px;
  border-radius: var(--border-radius);
  object-fit: contain;
}
</style>
