<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { IconExternalLink } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityPicture from '@/components/common/EntityPicture.vue';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  picture?: string | null;
  notes?: string;
  to?: string;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const router = useRouter();
const isExpanded = ref(false);

function openEntity() {
  if (!props.to) return;
  emit('cancel');
  void router.push(props.to);
}
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
    :show-expand="true"
    v-model:is-expanded="isExpanded"
    @cancel="emit('cancel')"
  >
    <template v-if="props.to" #header-actions>
      <QBtn
        class="entity-info-open"
        flat
        :title="t('common.open')"
        :aria-label="t('common.open')"
        @click="openEntity"
      >
        <IconExternalLink :size="20" />
      </QBtn>
    </template>

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
