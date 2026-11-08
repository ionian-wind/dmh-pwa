<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconPhoto, IconTrash } from '@tabler/icons-vue';
import EntityPicture from '@/components/common/EntityPicture.vue';
import { alert } from '@/dialogs';
import { importFile, pickFiles } from '@/utils/files';

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
  }>(),
  { modelValue: null },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const { t } = useI18n();
const isBusy = ref(false);

async function choosePicture() {
  if (isBusy.value) return;
  const [picked] = await pickFiles({
    multiple: false,
    description: 'Images',
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'],
    },
    acceptAttribute: 'image/*',
  });
  if (!picked) return;

  if (!picked.file.type.startsWith('image/')) {
    await alert(t('common.pictureImportError'));
    return;
  }

  isBusy.value = true;
  try {
    const { file } = await importFile(picked.file, {
      source: picked.source,
      storage: 'auto',
      contentHash: true,
    });
    emit('update:modelValue', file.id);
  } catch {
    await alert(t('common.pictureImportError'));
  } finally {
    isBusy.value = false;
  }
}

function removePicture() {
  emit('update:modelValue', '');
}
</script>

<template>
  <div class="entity-picture-picker column items-start q-gutter-sm">
    <div class="row items-center q-gutter-md">
      <EntityPicture :picture="props.modelValue" size="120px" />
      <div class="column q-gutter-sm">
        <QBtn
          class="entity-picture-select"
          color="primary"
          outline
          :loading="isBusy"
          :disable="isBusy"
          :title="t('common.selectPicture')"
          :aria-label="t('common.selectPicture')"
          @click="choosePicture"
        >
          <IconPhoto :size="18" class="q-mr-sm" />
          {{ t('common.selectPicture') }}
        </QBtn>
        <QBtn
          v-if="props.modelValue"
          class="entity-picture-remove"
          color="negative"
          flat
          :title="t('common.removePicture')"
          :aria-label="t('common.removePicture')"
          @click="removePicture"
        >
          <IconTrash :size="18" class="q-mr-sm" />
          {{ t('common.removePicture') }}
        </QBtn>
      </div>
    </div>
  </div>
</template>
