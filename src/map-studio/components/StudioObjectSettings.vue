<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';

const { t } = useI18n();
const store = useMapStudioStore();
const object = computed(() => store.selectedObject);

function updateSelected(patch: Record<string, unknown>): void {
  if (object.value) store.updateObject(object.value.id, patch);
}

function updateTransform(key: string, value: number): void {
  const current = object.value;
  if (
    !current ||
    (current.type !== 'text' && current.type !== 'image' && key !== 'rotation')
  ) {
    return;
  }
  if (key === 'rotation') {
    store.rotateSelectedObject(value);
    return;
  }
  store.updateObject(current.id, {
    transform: { ...current.transform, [key]: value },
  });
}
</script>

<template>
  <template v-if="object">
    <QSeparator class="q-my-sm" />
    <div class="row items-center justify-between q-mb-xs">
      <span class="text-caption text-weight-medium">{{
        t('mapStudio.objectSettings')
      }}</span>
      <span class="row q-gutter-xs">
        <QBtn
          flat
          dense
          round
          icon="tabler-copy"
          :title="t('mapStudio.duplicate')"
          @click="store.duplicateObject(object.id)"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-arrow-up"
          :title="t('mapStudio.bringForward')"
          @click="store.reorderObject(object.id, 1)"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-arrow-down"
          :title="t('mapStudio.sendBackward')"
          @click="store.reorderObject(object.id, -1)"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-trash"
          :title="t('common.delete')"
          @click="store.removeSelectedObject()"
        />
      </span>
    </div>
    <label v-if="object.type === 'text'" class="studio-field">
      <span>{{ t('mapStudio.text') }}</span>
      <input
        class="studio-text-input"
        :value="object.text"
        @change="
          updateSelected({
            text: ($event.target as HTMLInputElement).value,
          })
        "
      />
    </label>
    <label
      v-if="object.type === 'text' || object.type === 'image'"
      class="studio-field"
    >
      <span>X / Y</span>
      <input
        class="studio-number"
        type="number"
        step="0.1"
        :value="object.transform.x"
        @input="
          updateTransform(
            'x',
            Number(($event.target as HTMLInputElement).value),
          )
        "
      />
      <input
        class="studio-number"
        type="number"
        step="0.1"
        :value="object.transform.y"
        @input="
          updateTransform(
            'y',
            Number(($event.target as HTMLInputElement).value),
          )
        "
      />
    </label>
    <label v-if="object.type === 'text'" class="studio-field">
      <span>{{ t('mapStudio.fontSize') }}</span>
      <input
        class="studio-number"
        type="number"
        min="0.05"
        step="0.01"
        :value="object.fontSize"
        @input="
          updateSelected({
            fontSize: Number(($event.target as HTMLInputElement).value),
          })
        "
      />
      <input
        type="color"
        :value="object.color"
        @input="
          updateSelected({
            color: ($event.target as HTMLInputElement).value,
          })
        "
      />
    </label>
    <label v-if="object.type === 'door'" class="studio-field">
      <span>{{ t('mapStudio.variant') }}</span>
      <select
        :value="object.variant"
        @change="
          updateSelected({
            variant: Number(($event.target as HTMLSelectElement).value),
          })
        "
      >
        <option :value="0">1</option>
        <option :value="1">2</option>
      </select>
    </label>
    <label v-if="object.type === 'stairs'" class="studio-field">
      <span>{{ t('mapStudio.steps') }}</span>
      <input
        class="studio-number"
        type="number"
        min="1"
        step="1"
        :value="object.stepsPerCell"
        @input="
          updateSelected({
            stepsPerCell: Number(($event.target as HTMLInputElement).value),
          })
        "
      />
    </label>
    <label class="studio-field">
      <span>{{ t('mapStudio.opacity') }}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="object.opacity"
        @input="
          updateSelected({
            opacity: Number(($event.target as HTMLInputElement).value),
          })
        "
      />
    </label>
    <label class="studio-field">
      <span>{{ t('mapStudio.rotation') }}</span>
      <input
        class="studio-number"
        type="number"
        step="0.1"
        :value="object.transform.rotation"
        @input="
          updateTransform(
            'rotation',
            Number(($event.target as HTMLInputElement).value),
          )
        "
      />
    </label>
  </template>
</template>

<style scoped>
.studio-field {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  font-size: 12px;
}
.studio-field input[type='color'] {
  width: 28px;
  height: 24px;
  padding: 0;
  border: 0;
}
.studio-field input[type='range'] {
  width: 96px;
}
.studio-field--check {
  justify-content: flex-start;
}
.studio-number {
  width: 52px;
}
.studio-text-input {
  width: 120px;
}
</style>
