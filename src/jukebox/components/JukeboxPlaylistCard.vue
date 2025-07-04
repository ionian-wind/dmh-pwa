<script setup lang="ts">
import { computed } from 'vue';
import type { JukeboxPlaylist } from '../types';
import BaseCard from '@/components/common/BaseCard.vue';
import Button from '@/components/form/Button.vue';
import { useI18n } from 'vue-i18n';
import { IconMusic } from '@tabler/icons-vue';

const props = defineProps<{ playlist: JukeboxPlaylist }>();
const emit = defineEmits(['edit', 'delete', 'view', 'play']);

const { t } = useI18n();

const handleView = () => emit('view', props.playlist);
const handleEdit = () => emit('edit', props.playlist);
const handleDelete = () => emit('delete', props.playlist.id);
const handlePlay = () => emit('play', props.playlist);

const subtitle = computed(() => {
  const count = props.playlist.trackIds?.length || 0;
  return `${count} track${count === 1 ? '' : 's'}`;
});
</script>

<template>
  <BaseCard
    showView
    showEdit
    showDelete
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
  >
    <template #header>
      <h3>{{ playlist.name }}</h3>
      <h4>{{ subtitle }}</h4>
    </template>
    <div class="description" v-if="playlist.description">
      <p>{{ playlist.description }}</p>
    </div>
    <template #actions>
      <Button
        @click="handlePlay"
        variant="success"
        size="small"
        :title="t('common.play')"
      >
        <IconMusic />
      </Button>
    </template>
  </BaseCard>
</template>
<style scoped>
.description {
  margin: 0 0 1rem 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
