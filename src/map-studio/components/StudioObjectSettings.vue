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
          icon="tabler-flip-horizontal"
          :title="t('mapStudio.flipHorizontal')"
          @click="store.flipObject(object.id, 'x')"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-flip-vertical"
          :title="t('mapStudio.flipVertical')"
          @click="store.flipObject(object.id, 'y')"
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
      <span>{{ t('mapStudio.font') }}</span>
      <select
        :value="object.fontFamily"
        @change="
          updateSelected({
            fontFamily: ($event.target as HTMLSelectElement).value,
          })
        "
      >
        <option value="Georgia, serif">Georgia</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Courier New, monospace">Courier New</option>
        <option value="Times New Roman, serif">Times New Roman</option>
        <option value="Verdana, sans-serif">Verdana</option>
        <option value="Trebuchet MS, sans-serif">Trebuchet MS</option>
      </select>
    </label>
    <label v-if="object.type === 'text'" class="studio-field">
      <span>{{ t('mapStudio.alignment') }}</span>
      <select
        :value="object.align"
        @change="
          updateSelected({
            align: ($event.target as HTMLSelectElement).value,
          })
        "
      >
        <option value="left">{{ t('mapStudio.left') }}</option>
        <option value="center">{{ t('mapStudio.center') }}</option>
        <option value="right">{{ t('mapStudio.right') }}</option>
      </select>
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
    <label v-if="object.type === 'door'" class="studio-field">
      <span>{{ t('mapStudio.fill') }}</span>
      <input
        type="color"
        :value="object.fill"
        @input="
          updateSelected({
            fill: ($event.target as HTMLInputElement).value,
          })
        "
      />
    </label>
    <label v-if="object.type === 'door'" class="studio-field">
      <span>{{ t('mapStudio.stroke') }}</span>
      <input
        type="color"
        :value="object.stroke"
        @input="
          updateSelected({
            stroke: ($event.target as HTMLInputElement).value,
          })
        "
      />
    </label>
    <label v-if="object.type === 'door'" class="studio-field">
      <span>{{ t('mapStudio.rough') }}</span>
      <select
        :value="object.rough"
        @change="
          updateSelected({
            rough: Number(($event.target as HTMLSelectElement).value),
          })
        "
      >
        <option :value="0">0</option>
        <option :value="1">1</option>
        <option :value="2">2</option>
        <option :value="3">3</option>
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
    <label v-if="object.type === 'stairs'" class="studio-field">
      <span>{{ t('mapStudio.stroke') }}</span>
      <input
        type="color"
        :value="object.stroke"
        @input="
          updateSelected({
            stroke: ($event.target as HTMLInputElement).value,
          })
        "
      />
    </label>
    <label v-if="object.type === 'stairs'" class="studio-field">
      <span>{{ t('mapStudio.rough') }}</span>
      <select
        :value="object.rough"
        @change="
          updateSelected({
            rough: Number(($event.target as HTMLSelectElement).value),
          })
        "
      >
        <option :value="0">0</option>
        <option :value="1">1</option>
        <option :value="2">2</option>
        <option :value="3">3</option>
      </select>
    </label>
    <template v-if="object.type === 'text'">
      <label class="studio-field studio-field--check">
        <input
          type="checkbox"
          :checked="object.shadow.enabled"
          @change="
            updateSelected({
              shadow: {
                ...object.shadow,
                enabled: ($event.target as HTMLInputElement).checked,
              },
            })
          "
        />
        <span>{{ t('mapStudio.dropShadow') }}</span>
      </label>
      <template v-if="object.shadow.enabled">
        <label class="studio-field">
          <span>{{ t('mapStudio.shadowColor') }}</span>
          <input
            type="color"
            :value="object.shadow.color"
            @input="
              updateSelected({
                shadow: {
                  ...object.shadow,
                  color: ($event.target as HTMLInputElement).value,
                },
              })
            "
          />
        </label>
        <label class="studio-field">
          <span>{{ t('mapStudio.offsetX') }}</span>
          <input
            class="studio-number"
            type="number"
            step="0.01"
            :value="object.shadow.offsetX"
            @input="
              updateSelected({
                shadow: {
                  ...object.shadow,
                  offsetX: Number(($event.target as HTMLInputElement).value),
                },
              })
            "
          />
        </label>
        <label class="studio-field">
          <span>{{ t('mapStudio.offsetY') }}</span>
          <input
            class="studio-number"
            type="number"
            step="0.01"
            :value="object.shadow.offsetY"
            @input="
              updateSelected({
                shadow: {
                  ...object.shadow,
                  offsetY: Number(($event.target as HTMLInputElement).value),
                },
              })
            "
          />
        </label>
        <label class="studio-field">
          <span>{{ t('mapStudio.shadowOpacity') }}</span>
          <input
            class="studio-number"
            type="number"
            min="0"
            max="1"
            step="0.05"
            :value="object.shadow.opacity"
            @input="
              updateSelected({
                shadow: {
                  ...object.shadow,
                  opacity: Number(($event.target as HTMLInputElement).value),
                },
              })
            "
          />
        </label>
      </template>
    </template>
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
      <span>{{ t('mapStudio.blendMode') }}</span>
      <select
        :value="object.blendMode"
        @change="
          updateSelected({
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
