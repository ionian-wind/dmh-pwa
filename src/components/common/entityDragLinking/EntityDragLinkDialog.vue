<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import EntityLinkingDialog from '@/components/common/EntityLinkingDialog.vue';
import { getEntityKindOption } from '@/components/common/entityLinking/entityRefs';
import type { MapEntityRef } from '@/maps/types';
import { noteDisplayTitle } from '@/utils/noteTitle';
import { useEntityLinkRelations } from './relations';
import type { EntityDragData, EntityLinkKind } from './registry';
import { toMapEntityKind } from './registry';

const props = defineProps<{
  source: EntityDragData;
  kind: EntityLinkKind;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const { t } = useI18n();
const relations = useEntityLinkRelations();
const isReady = ref(false);

const optionConfig = computed(() => getEntityKindOption(props.kind));
const title = computed(() =>
  t(optionConfig.value?.labelKey ?? 'common.linkedEntities'),
);

const options = computed(() =>
  relations
    .items(props.kind)
    .filter(
      (entity) =>
        !(props.source.kind === props.kind && entity.id === props.source.id),
    )
    .map((entity) => ({
      id: entity.id,
      label:
        props.kind === 'note'
          ? noteDisplayTitle(entity) || String(entity.id)
          : String(
              entity[optionConfig.value?.titleField ?? 'name'] || entity.id,
            ),
    })),
);

const linkedIds = computed(() =>
  relations.getLinkedIds(props.source.kind, props.source.id, props.kind),
);

onMounted(async () => {
  await relations.loadFor(props.source.kind, props.kind);
  isReady.value = true;
});

async function handleAdd(payload: { refs: MapEntityRef[] }) {
  await relations.setLinkedIds(
    props.source.kind,
    props.source.id,
    props.kind,
    payload.refs
      .filter((ref) => ref.kind === toMapEntityKind(props.kind))
      .map((ref) => ref.id),
  );
  emit('close');
}
</script>

<template>
  <EntityLinkingDialog
    v-if="isReady"
    :is-open="true"
    :kind="toMapEntityKind(kind)"
    :title="title"
    :options="options"
    :linked-ids="linkedIds"
    @add="handleAdd"
    @cancel="emit('close')"
  />
</template>
