<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar';
import { useI18n } from 'vue-i18n';

defineProps<{
  message?: string;
}>();

defineEmits(['ok', 'hide']);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();
const { t } = useI18n();
</script>

<template>
  <QDialog ref="dialogRef" persistent @hide="onDialogHide">
    <QCard class="q-dialog-plugin unsaved-changes-dialog">
      <QCardSection>
        <div class="text-h6">{{ t('common.unsavedChangesTitle') }}</div>
      </QCardSection>
      <QCardSection>
        {{ message || t('common.unsavedChangesMessage') }}
      </QCardSection>
      <QCardActions align="right">
        <QBtn
          class="unsaved-save"
          color="positive"
          :label="t('common.save')"
          @click="onDialogOK('save')"
        />
        <QBtn
          class="unsaved-discard"
          color="negative"
          :label="t('common.doNotSave')"
          @click="onDialogOK('discard')"
        />
        <QBtn
          class="unsaved-cancel"
          color="grey-7"
          :label="t('common.cancel')"
          @click="onDialogCancel"
        />
      </QCardActions>
    </QCard>
  </QDialog>
</template>
