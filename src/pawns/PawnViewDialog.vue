<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';
import type { Pawn } from '@/types';

const props = defineProps<{
  isOpen: boolean;
  pawn: Pawn | null;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const title = computed(() => props.pawn?.name ?? '');
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    :title="title"
    modal-id="pawn-view-dialog"
    :show-submit="false"
    :show-cancel="true"
    :cancel-label="t('common.close')"
    :use-modal-stack="false"
    @cancel="emit('cancel')"
  >
    <div class="pawn-view-content">
      <MilkdownView
        v-if="pawn?.notes"
        :task-checkbox-enabled="true"
        :enable-mention-modal="true"
        :content="pawn.notes"
      />
      <div v-else class="text-caption text-grey-7">
        {{ t('common.noDescription') }}
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.pawn-view-content {
  padding: 1rem;
}
</style>
