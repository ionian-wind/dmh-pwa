<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { IconExternalLink } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';
import { entityRoute } from '@/components/common/entityLinking/entityRefs';
import type { Pawn } from '@/types';

const props = defineProps<{
  isOpen: boolean;
  pawn: Pawn | null;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const router = useRouter();
const isExpanded = ref(false);
const title = computed(() => props.pawn?.name ?? '');
const openTo = computed(() =>
  props.pawn ? entityRoute('pawn', props.pawn.id) : undefined,
);

function openPawn() {
  if (!openTo.value) return;
  emit('cancel');
  void router.push(openTo.value);
}
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
    :show-expand="true"
    v-model:is-expanded="isExpanded"
    @cancel="emit('cancel')"
  >
    <template v-if="openTo" #header-actions>
      <QBtn
        class="pawn-view-open"
        flat
        :title="t('common.open')"
        :aria-label="t('common.open')"
        @click="openPawn"
      >
        <IconExternalLink :size="20" />
      </QBtn>
    </template>

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
