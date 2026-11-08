<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityPicture from '@/components/common/EntityPicture.vue';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  picture?: string | null;
  notes?: string;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <BaseModal
    :is-open="props.isOpen"
    :title="props.title"
    modal-id="entity-info-dialog"
    :show-submit="false"
    :show-cancel="true"
    :cancel-label="t('common.close')"
    :use-modal-stack="false"
    @cancel="emit('cancel')"
  >
    <div class="entity-info-dialog column items-center q-gutter-md">
      <EntityPicture
        v-if="props.picture"
        :picture="props.picture"
        size="240px"
        :alt="props.title"
      />
      <div class="entity-info-notes full-width">
        <MilkdownView
          v-if="props.notes"
          :task-checkbox-enabled="true"
          :enable-mention-modal="true"
          :content="props.notes"
        />
        <div v-else class="text-caption text-grey-7">
          {{ t('common.noDescription') }}
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.entity-info-dialog {
  padding: 1rem;
}

.entity-info-notes {
  min-width: 0;
}
</style>
