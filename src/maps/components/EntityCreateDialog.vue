<template>
  <component
    :is="editorComponent"
    v-bind="editorProps"
    v-on="editorListeners"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import { alert } from '@/dialogs';
import { createLinkedEntity } from '@/maps/utils/createLinkedEntity';
import type { MapEntityKind, MapEntityRef } from '@/maps/types';

const props = defineProps<{
  kind: MapEntityKind;
}>();

const emit = defineEmits<{
  (e: 'created', payload: { ref: MapEntityRef; label: string }): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const isSaving = ref(false);

const editors: Partial<Record<MapEntityKind, Component>> = {
  note: defineAsyncComponent(() => import('@/notes/NoteEditor.vue')),
  module: defineAsyncComponent(() => import('@/modules/ModuleEditor.vue')),
  party: defineAsyncComponent(() => import('@/parties/PartyEditor.vue')),
  monster: defineAsyncComponent(() => import('@/monsters/MonsterEditor.vue')),
  encounter: defineAsyncComponent(
    () => import('@/encounters/EncounterEditor.vue'),
  ),
  character: defineAsyncComponent(
    () => import('@/characters/CharacterEditor.vue'),
  ),
  location: defineAsyncComponent(
    () => import('@/maps/components/MapLocationEditor.vue'),
  ),
  playlist: defineAsyncComponent(
    () => import('@/jukebox/components/PlaylistEditor.vue'),
  ),
};

const editorComponent = computed(() => editors[props.kind]);

const editorListeners = computed(() => {
  const listeners: Record<string, (...args: any[]) => void> = {
    submit: handleSubmit,
    cancel: handleCancel,
    'update:modelValue': handleModelUpdate,
  };
  if (props.kind === 'playlist') {
    listeners.saved = handleSubmit;
  }
  return listeners;
});

const editorProps = computed(() => {
  switch (props.kind) {
    case 'note':
      return { note: null, isOpen: true, useModalStack: false };
    case 'module':
      return { module: null, isOpen: true, useModalStack: false };
    case 'party':
      return { party: null, isOpen: true, useModalStack: false };
    case 'monster':
      return { monster: null, isOpen: true, useModalStack: false };
    case 'encounter':
      return { encounter: null, isOpen: true, useModalStack: false };
    case 'character':
      return { character: null, isOpen: true, useModalStack: false };
    case 'location':
      return { location: null, isOpen: true, useModalStack: false };
    case 'playlist':
      return { modelValue: true, playlist: null, useModalStack: false };
    default:
      return {};
  }
});

async function handleSubmit(payload: unknown) {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const created = await createLinkedEntity(props.kind, payload);
    if (!created) return;
    emit('created', {
      ref: { kind: props.kind, id: created.id },
      label: created.label,
    });
  } catch {
    await alert(t('common.error'));
  } finally {
    isSaving.value = false;
  }
}

function handleCancel() {
  if (!isSaving.value) emit('cancel');
}

function handleModelUpdate(value: boolean) {
  if (!value) handleCancel();
}
</script>
