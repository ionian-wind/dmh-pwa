<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import type { StudioObject } from '@/map-studio/domain/document/types';

const { t } = useI18n();
const store = useMapStudioStore();
const objects = computed<StudioObject[]>(() => store.selectedObjects);
const count = computed(() => objects.value.length);
const type = computed<StudioObject['type'] | null>(() => {
  const first = objects.value[0];
  if (!first) return null;
  return objects.value.every((object) => object.type === first.type)
    ? first.type
    : null;
});

function commonValue<T>(read: (object: StudioObject) => T): T | undefined {
  const first = objects.value[0];
  if (!first) return undefined;
  const value = read(first);
  return objects.value.every((object) => read(object) === value)
    ? value
    : undefined;
}

const opacity = computed(() => commonValue((object) => object.opacity));
const blendMode = computed(() => commonValue((object) => object.blendMode));
const opacityAverage = computed(
  () =>
    objects.value.reduce((sum, object) => sum + object.opacity, 0) /
    Math.max(1, objects.value.length),
);
const rotation = computed(() =>
  commonValue((object) => object.transform.rotation),
);
const variant = computed(() =>
  commonValue(
    (object) => (object as Extract<StudioObject, { type: 'door' }>).variant,
  ),
);
const steps = computed(() =>
  commonValue(
    (object) =>
      (object as Extract<StudioObject, { type: 'stairs' }>).stepsPerCell,
  ),
);
const fontSize = computed(() =>
  commonValue(
    (object) => (object as Extract<StudioObject, { type: 'text' }>).fontSize,
  ),
);
const color = computed(() =>
  commonValue(
    (object) => (object as Extract<StudioObject, { type: 'text' }>).color,
  ),
);

function setTypeProperty(key: string, value: unknown): void {
  store.updateSelectedObjects({ [key]: value });
}
</script>

<template>
  <template v-if="count > 1">
    <QSeparator class="q-my-sm" />
    <div class="row items-center justify-between q-mb-xs">
      <span class="text-caption text-weight-medium">{{
        t('mapStudio.objectsSelected', { count })
      }}</span>
      <span class="row q-gutter-xs">
        <QBtn
          flat
          dense
          round
          icon="tabler-users-group"
          :title="
            store.selectedGroupId
              ? t('mapStudio.ungroup')
              : t('mapStudio.group')
          "
          @click="store.toggleGroupSelection()"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-copy"
          :title="t('mapStudio.duplicate')"
          @click="store.duplicateSelectedObjects()"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-arrow-up"
          :title="t('mapStudio.bringForward')"
          @click="store.reorderSelectedObjects(1)"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-arrow-down"
          :title="t('mapStudio.sendBackward')"
          @click="store.reorderSelectedObjects(-1)"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-flip-horizontal"
          :title="t('mapStudio.flipHorizontal')"
          @click="store.flipSelectedObjects('x')"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-flip-vertical"
          :title="t('mapStudio.flipVertical')"
          @click="store.flipSelectedObjects('y')"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-trash"
          :title="t('common.delete')"
          @click="store.removeSelectedObjects()"
        />
      </span>
    </div>

    <label class="studio-field">
      <span>{{ t('mapStudio.opacity') }}</span>
      <span v-if="opacity === undefined" class="studio-mixed">
        {{ t('mapStudio.mixed') }}
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="opacity ?? opacityAverage"
        @input="
          store.updateSelectedObjects({
            opacity: Number(($event.target as HTMLInputElement).value),
          })
        "
      />
    </label>
    <label class="studio-field">
      <span>{{ t('mapStudio.blendMode') }}</span>
      <span v-if="blendMode === undefined" class="studio-mixed">
        {{ t('mapStudio.mixed') }}
      </span>
      <select
        :value="blendMode ?? 'normal'"
        @change="
          store.updateSelectedObjects({
            blendMode: ($event.target as HTMLSelectElement).value,
          })
        "
      >
        <option value="normal">Normal</option>
        <option value="add">Add</option>
        <option value="multiply">Multiply</option>
        <option value="screen">Screen</option>
      </select>
    </label>
    <label class="studio-field">
      <span>{{ t('mapStudio.rotation') }}</span>
      <span v-if="rotation === undefined" class="studio-mixed">
        {{ t('mapStudio.mixed') }}
      </span>
      <input
        class="studio-number"
        type="number"
        step="0.1"
        :value="rotation ?? ''"
        @input="
          store.setSelectedObjectsRotation(
            Number(($event.target as HTMLInputElement).value),
          )
        "
      />
    </label>

    <label v-if="type === 'text'" class="studio-field">
      <span>{{ t('mapStudio.fontSize') }}</span>
      <input
        class="studio-number"
        type="number"
        min="0.05"
        step="0.01"
        :value="fontSize ?? ''"
        @input="
          setTypeProperty(
            'fontSize',
            Number(($event.target as HTMLInputElement).value),
          )
        "
      />
      <input
        type="color"
        :value="color ?? '#000000'"
        @input="
          setTypeProperty('color', ($event.target as HTMLInputElement).value)
        "
      />
    </label>
    <label v-if="type === 'door'" class="studio-field">
      <span>{{ t('mapStudio.variant') }}</span>
      <select
        :value="variant ?? ''"
        @change="
          setTypeProperty(
            'variant',
            Number(($event.target as HTMLSelectElement).value),
          )
        "
      >
        <option value="" disabled>{{ t('mapStudio.mixed') }}</option>
        <option :value="0">1</option>
        <option :value="1">2</option>
      </select>
    </label>
    <label v-if="type === 'stairs'" class="studio-field">
      <span>{{ t('mapStudio.steps') }}</span>
      <input
        class="studio-number"
        type="number"
        min="1"
        step="1"
        :value="steps ?? ''"
        @input="
          setTypeProperty(
            'stepsPerCell',
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
.studio-number {
  width: 52px;
}
.studio-mixed {
  padding: 0 4px;
  font-size: 10px;
  font-style: italic;
  opacity: 0.6;
}
</style>
