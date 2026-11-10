<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';

const { t } = useI18n();
const store = useMapStudioStore();

const divisions = [1, 2, 3, 4, 6, 8, 9].map((value) => ({
  label: `1/${value}`,
  value,
}));
const roughnessOptions = [0, 1, 2, 3].map((value) => ({
  label: String(value),
  value,
}));
const doorVariantOptions = [
  { label: '1', value: 0 },
  { label: '2', value: 1 },
];
const drawToOptions = computed(() => [
  { label: t('mapStudio.point'), value: 'point' },
  { label: t('mapStudio.edge'), value: 'edge' },
]);
const fontOptions = [
  'Georgia, serif',
  'Arial, sans-serif',
  'Courier New, monospace',
  'Times New Roman, serif',
  'Verdana, sans-serif',
  'Trebuchet MS, sans-serif',
];
const toolLabel = computed(() => t(`mapStudio.${store.tool}`));

function setCircleSides(value: number | string | null | undefined): void {
  store.toolSettings.sides = Math.max(
    1,
    Math.min(12, Math.round(Number(value) || 1)),
  );
}
</script>

<template>
  <aside class="studio-tool-settings">
    <div class="studio-tool-settings-title">
      <span>{{ toolLabel }}</span>
    </div>

    <div class="settings-row">
      <span>{{ t('mapStudio.mode') }}</span>
      <span class="settings-segment">
        <button
          type="button"
          :class="{ active: store.toolSettings.mode === 'draw' }"
          @click="store.toolSettings.mode = 'draw'"
        >
          {{ t('mapStudio.draw') }}
        </button>
        <button
          type="button"
          :class="{ active: store.toolSettings.mode === 'erase' }"
          @click="store.toolSettings.mode = 'erase'"
        >
          {{ t('mapStudio.erase') }}
        </button>
      </span>
    </div>
    <div class="settings-row">
      <span>{{ t('mapStudio.snap') }}</span>
      <QToggle v-model="store.toolSettings.snap" dense />
    </div>
    <label class="settings-row">
      <span>{{ t('mapStudio.division') }}</span>
      <QSelect
        v-model="store.toolSettings.division"
        dense
        outlined
        emit-value
        map-options
        :options="divisions"
        class="settings-control"
      />
    </label>
    <div class="settings-row">
      <span>{{ t('mapStudio.rough') }}</span>
      <QToggle v-model="store.toolSettings.roughMode" dense />
    </div>

    <template
      v-if="
        store.tool === 'polygon' ||
        store.tool === 'path' ||
        store.tool === 'wall'
      "
    >
      <div class="settings-row">
        <span>{{ t('mapStudio.smooth') }}</span>
        <QToggle v-model="store.toolSettings.smooth" dense />
      </div>
    </template>

    <template v-if="store.tool === 'wall'">
      <label class="settings-row">
        <span>{{ t('mapStudio.width') }}</span>
        <QInput
          v-model.number="store.toolSettings.wallWidth"
          dense
          outlined
          type="number"
          min="0.01"
          step="0.01"
          class="settings-control studio-sides-input"
        />
      </label>
      <div class="settings-row">
        <span>{{ t('mapStudio.dash') }}</span>
        <QToggle v-model="store.toolSettings.wallDash" dense />
      </div>
      <label v-if="store.toolSettings.wallDash" class="settings-row">
        <span>{{ t('mapStudio.dashSize') }}</span>
        <QInput
          v-model.number="store.toolSettings.wallDashSize"
          dense
          outlined
          type="number"
          min="0.05"
          step="0.05"
          class="settings-control studio-sides-input"
        />
      </label>
    </template>

    <template v-if="store.tool === 'stairs'">
      <label class="settings-row">
        <span>{{ t('mapStudio.steps') }}</span>
        <QInput
          v-model.number="store.toolSettings.stairsSteps"
          dense
          outlined
          type="number"
          min="1"
          step="1"
          class="settings-control"
        />
      </label>
      <label class="settings-row">
        <span>{{ t('mapStudio.stroke') }}</span>
        <input
          type="color"
          :value="store.toolSettings.stairsStroke"
          @input="
            store.toolSettings.stairsStroke = (
              $event.target as HTMLInputElement
            ).value
          "
        />
      </label>
      <label class="settings-row">
        <span>{{ t('mapStudio.rough') }}</span>
        <QSelect
          v-model="store.toolSettings.stairsRough"
          dense
          outlined
          emit-value
          map-options
          :options="roughnessOptions"
          class="settings-control"
        />
      </label>
    </template>

    <template v-if="store.tool === 'door'">
      <label class="settings-row">
        <span>{{ t('mapStudio.variant') }}</span>
        <QSelect
          v-model="store.toolSettings.doorVariant"
          dense
          outlined
          emit-value
          map-options
          :options="doorVariantOptions"
          class="settings-control"
        />
      </label>
      <label class="settings-row">
        <span>{{ t('mapStudio.fill') }}</span>
        <input
          type="color"
          :value="store.toolSettings.doorFill"
          @input="
            store.toolSettings.doorFill = (
              $event.target as HTMLInputElement
            ).value
          "
        />
      </label>
      <label class="settings-row">
        <span>{{ t('mapStudio.stroke') }}</span>
        <input
          type="color"
          :value="store.toolSettings.doorStroke"
          @input="
            store.toolSettings.doorStroke = (
              $event.target as HTMLInputElement
            ).value
          "
        />
      </label>
      <label class="settings-row">
        <span>{{ t('mapStudio.rough') }}</span>
        <QSelect
          v-model="store.toolSettings.doorRough"
          dense
          outlined
          emit-value
          map-options
          :options="roughnessOptions"
          class="settings-control"
        />
      </label>
    </template>

    <template v-if="store.tool === 'text'">
      <label class="settings-row">
        <span>{{ t('mapStudio.font') }}</span>
        <QSelect
          v-model="store.toolSettings.text.fontFamily"
          dense
          outlined
          :options="fontOptions"
          class="settings-control settings-control--wide"
        />
      </label>
      <label class="settings-row">
        <span>{{ t('mapStudio.fontSize') }}</span>
        <QInput
          v-model.number="store.toolSettings.text.fontSize"
          dense
          outlined
          type="number"
          min="0.05"
          step="0.01"
          class="settings-control"
        />
      </label>
      <label class="settings-row">
        <span>{{ t('mapStudio.colour') }}</span>
        <input
          type="color"
          :value="store.toolSettings.text.color"
          @input="
            store.toolSettings.text.color = (
              $event.target as HTMLInputElement
            ).value
          "
        />
      </label>
      <div class="settings-row">
        <span>{{ t('mapStudio.alignment') }}</span>
        <QBtnGroup flat>
          <QBtn
            v-for="alignment in ['left', 'center', 'right'] as const"
            :key="alignment"
            flat
            dense
            round
            :icon="`tabler-align-${alignment}`"
            :class="{
              'studio-tool--active':
                store.toolSettings.text.align === alignment,
            }"
            :aria-label="t(`mapStudio.${alignment}`)"
            @click="store.toolSettings.text.align = alignment"
          />
        </QBtnGroup>
      </div>
      <div class="settings-row">
        <span>{{ t('mapStudio.dropShadow') }}</span>
        <QToggle v-model="store.toolSettings.text.shadow.enabled" dense />
      </div>
      <template v-if="store.toolSettings.text.shadow.enabled">
        <label class="settings-row">
          <span>{{ t('mapStudio.shadowColor') }}</span>
          <input
            type="color"
            :value="store.toolSettings.text.shadow.color"
            @input="
              store.toolSettings.text.shadow.color = (
                $event.target as HTMLInputElement
              ).value
            "
          />
        </label>
        <label class="settings-row">
          <span>{{ t('mapStudio.offsetX') }}</span>
          <QInput
            v-model.number="store.toolSettings.text.shadow.offsetX"
            dense
            outlined
            type="number"
            step="0.01"
            class="settings-control"
          />
        </label>
        <label class="settings-row">
          <span>{{ t('mapStudio.offsetY') }}</span>
          <QInput
            v-model.number="store.toolSettings.text.shadow.offsetY"
            dense
            outlined
            type="number"
            step="0.01"
            class="settings-control"
          />
        </label>
        <label class="settings-row">
          <span>{{ t('mapStudio.shadowOpacity') }}</span>
          <QInput
            v-model.number="store.toolSettings.text.shadow.opacity"
            dense
            outlined
            type="number"
            min="0"
            max="1"
            step="0.05"
            class="settings-control"
          />
        </label>
      </template>
    </template>

    <label v-if="store.tool === 'path'" class="settings-row">
      <span>{{ t('mapStudio.radius') }}</span>
      <QInput
        v-model.number="store.toolSettings.pathRadius"
        dense
        outlined
        type="number"
        class="settings-control"
      />
    </label>
    <label v-if="store.tool === 'rectangle'" class="settings-row">
      <span>{{ t('mapStudio.cornerRadius') }}</span>
      <QInput
        v-model.number="store.toolSettings.cornerRadius"
        dense
        outlined
        type="number"
        class="settings-control"
      />
    </label>
    <template v-if="store.tool === 'circle'">
      <label class="settings-row">
        <span>{{ t('mapStudio.sides') }}</span>
        <QInput
          :model-value="store.toolSettings.sides"
          dense
          outlined
          type="number"
          min="1"
          max="12"
          class="settings-control studio-sides-input"
          @update:model-value="setCircleSides"
        />
      </label>
      <label class="settings-row">
        <span>{{ t('mapStudio.sides') }}</span>
        <QSlider
          :model-value="store.toolSettings.sides"
          :min="1"
          :max="12"
          :step="1"
          class="settings-slider studio-sides-slider"
          @update:model-value="setCircleSides"
        />
      </label>
      <label class="settings-row">
        <span>{{ t('mapStudio.drawTo') }}</span>
        <QSelect
          v-model="store.toolSettings.drawTo"
          dense
          outlined
          emit-value
          map-options
          :options="drawToOptions"
          class="settings-control"
        />
      </label>
    </template>
  </aside>
</template>

<style scoped>
.studio-tool-settings {
  padding: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
}
.studio-tool-settings-title {
  padding: 4px 6px 8px;
  font-weight: 600;
}
.settings-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  font-size: 12px;
}
.settings-control {
  width: 88px;
}
.settings-control--wide {
  width: 110px;
}
.settings-slider {
  width: 88px;
}
.settings-row input[type='color'] {
  width: 28px;
  height: 24px;
  padding: 0;
  border: 0;
}
.settings-segment {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--color-surface);
  border-radius: 5px;
}
.settings-segment button {
  padding: 3px 8px;
  font: inherit;
  font-size: 11px;
  color: inherit;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 3px;
}
.settings-segment button.active {
  background: var(--color-selected-surface);
}
</style>
