<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    modal-id="markdown-format-help"
    :title="t('markdownEditor.formattingHelp')"
    :show-submit="false"
    :show-cancel="true"
    :cancel-label="t('common.close')"
    @cancel="emit('cancel')"
    @update:is-open="(value) => emit('update:isOpen', value)"
  >
    <QCard flat bordered class="markdown-help">
      <QCardSection class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <span class="help-title">
            {{ t('markdownEditor.help.internalLinks') }}
          </span>
          <code>[title](type://id)</code>
          <p>{{ t('markdownEditor.help.linkToOtherEntities') }}</p>
          <ul>
            <li>
              <code>[Note Title](note://123)</code> -
              {{ t('markdownEditor.help.linkToNote') }}
            </li>
            <li>
              <code>[Module Name](module://123)</code> -
              {{ t('markdownEditor.help.linkToModule') }}
            </li>
            <li>
              <code>[Party Name](party://123)</code> -
              {{ t('markdownEditor.help.linkToParty') }}
            </li>
            <li>
              <code>[Monster Name](monster://123)</code> -
              {{ t('markdownEditor.help.linkToMonster') }}
            </li>
            <li>
              <code>[Encounter Name](encounter://123)</code> -
              {{ t('markdownEditor.help.linkToEncounter') }}
            </li>
          </ul>
        </div>
        <div class="col-12 col-md-6">
          <span class="help-title">
            {{ t('markdownEditor.help.markdown') }}
          </span>
          <p>{{ t('markdownEditor.help.basicFormatting') }}</p>
          <ul>
            <li>
              <code>**bold**</code> -
              <strong>{{ t('markdownEditor.help.boldText') }}</strong>
            </li>
            <li>
              <code>*italic*</code> -
              <em>{{ t('markdownEditor.help.italicText') }}</em>
            </li>
            <li>
              <code># Heading</code> -
              {{ t('markdownEditor.help.sectionHeading') }}
            </li>
            <li>
              <code>- item</code> - {{ t('markdownEditor.help.bulletList') }}
            </li>
            <li>
              <code>1. item</code> -
              {{ t('markdownEditor.help.numberedList') }}
            </li>
            <li>
              <code>- [ ] Task item</code> {{ t('markdownEditor.help.or') }}
              <code>- [x] {{ t('markdownEditor.help.completedTask') }}</code>
              -
              {{ t('markdownEditor.help.taskList') }}
            </li>
          </ul>
          <p>
            <em>{{ t('markdownEditor.help.taskLists') }}</em>
            {{ t('markdownEditor.help.taskListsWillRender') }}
          </p>
        </div>
      </QCardSection>
    </QCard>
  </BaseModal>
</template>

<style scoped>
.markdown-help {
  max-height: 70vh;
  overflow: auto;
}

.help-title {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
</style>
