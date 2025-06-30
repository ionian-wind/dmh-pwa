<script setup lang="ts">
import {ref, watch, type Ref, computed, onMounted} from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ModuleMultipleSelector from '@/components/ModuleMultipleSelector.vue';
import { useJukeboxPlaylistsStore } from '../stores';
import { useModuleStore } from '@/stores/modules';
import type { JukeboxPlaylist } from '../types';
import type { UUID } from '@/types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: boolean;
  playlist: JukeboxPlaylist | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const playlistsStore = useJukeboxPlaylistsStore();
const moduleStore = useModuleStore();
const { t } = useI18n();

type EditablePlaylist = {
  name: string;
  description?: string;
  trackIds: UUID[];
  moduleIds?: string[];
};

const editablePlaylist: Ref<EditablePlaylist> = ref({ 
  name: '', 
  description: '', 
  trackIds: [],
  moduleIds: []
});

watch(() => props.playlist, (newPlaylist) => {
  if (newPlaylist) {
    editablePlaylist.value = { ...newPlaylist };
  } else {
    editablePlaylist.value = { 
      name: '', 
      description: '', 
      trackIds: [],
      moduleIds: []
    };
  }
}, { immediate: true });

// Reset form when modal opens for new playlist
watch(() => props.modelValue, (isOpen) => {
  if (isOpen && !props.playlist) {
    editablePlaylist.value = { 
      name: '', 
      description: '', 
      trackIds: [],
      moduleIds: []
    };
  }
});

const moduleIdsProxy = computed<string[]>({
  get() {
    return editablePlaylist.value.moduleIds ?? [];
  },
  set(val) {
    editablePlaylist.value.moduleIds = val;
  }
});

onMounted(() => moduleStore.load());

async function save() {
  if (props.playlist && props.playlist.id) {
    const updatedPlaylist = await playlistsStore.update(props.playlist.id, {
      name: editablePlaylist.value.name,
      description: editablePlaylist.value.description,
      trackIds: editablePlaylist.value.trackIds,
      moduleIds: editablePlaylist.value.moduleIds,
    });
    emit('saved', updatedPlaylist);
  } else {
    const newPlaylist = await playlistsStore.create(editablePlaylist.value);
    emit('saved', newPlaylist);
  }
  emit('update:modelValue', false);
}
</script>

<template>
  <BaseModal 
    :isOpen="modelValue" 
    modalId="playlist-editor" 
    @update:isOpen="$emit('update:modelValue', $event)" 
    title="Playlist"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="t('common.save')"
    cancelLabel="t('common.cancel')"
    @submit="save"
    @cancel="$emit('update:modelValue', false)"
  >
    <template #title>{{ t('common.playlist') }}</template>
    <div class="form-group">
      <label for="playlist-name">{{ t('playlist.name') }}</label>
      <input id="playlist-name" v-model="editablePlaylist.name" type="text" required />
    </div>
    <div class="form-group">
      <label for="playlist-description">{{ t('playlist.description') }}</label>
      <textarea id="playlist-description" v-model="editablePlaylist.description"></textarea>
    </div>
    <div class="form-group">
      <label for="playlist-modules">{{ t('playlist.modules') }}</label>
      <ModuleMultipleSelector
        id="playlist-modules"
        v-model="moduleIdsProxy"
        placeholder="t('common.noModules')"
      />
    </div>
  </BaseModal>
</template>

<style scoped>
.form-group {
  margin-bottom: 1em;
}
label {
  display: block;
  margin-bottom: 0.5em;
}
input, textarea {
  width: 100%;
  padding: 0.5em;
}
</style> 
