<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePawnStore } from '@/stores/pawns';
import BaseListView from '@/components/common/BaseListView.vue';
import PawnCard from '@/pawns/PawnCard.vue';
import PawnEditor from '@/pawns/PawnEditor.vue';
import type { Pawn } from '@/types';
import { useI18n } from 'vue-i18n';
import { confirm } from '@/dialogs';

const router = useRouter();
const pawnStore = usePawnStore();
const { t } = useI18n();

onMounted(async () => {
  await pawnStore.load();
});

const cardProps = (pawn: Pawn) => ({
  pawn,
  showActions: true,
  onView: () => handleView(pawn),
  onEdit: () => handleEdit(pawn),
  onDelete: () => handleDelete(pawn),
});

const editorProps = (pawn: Pawn | null) => ({
  pawn,
  isOpen: true,
});

async function handleDelete(pawn: Pawn) {
  if (
    pawn.id &&
    (await confirm(t('common.confirmDelete', { title: pawn.name })))
  ) {
    await pawnStore.remove(pawn.id);
    return true;
  }
  return false;
}

async function handleSubmit(pawn: Pawn) {
  if (pawn.id) {
    await pawnStore.update(pawn.id, pawn);
  } else {
    await pawnStore.create(pawn);
  }
}

async function handleCopy(pawn: Pawn) {
  const { id, createdAt, updatedAt, ...rest } = pawn;
  await pawnStore.create(rest);
}

function handleEdit(pawn: Pawn) {
  // handled by BaseListView
}

function handleView(pawn: Pawn) {
  router.push(`/pawns/${pawn.id}`);
}
</script>

<template>
  <BaseListView
    :items="pawnStore.filtered"
    :card-component="PawnCard"
    :editor-component="PawnEditor"
    :empty-message="t('common.emptyPawns')"
    :create-title="t('pawns.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    @submit="handleSubmit"
    @copy="handleCopy"
    @view="handleView"
    @delete="handleDelete"
  />
</template>
