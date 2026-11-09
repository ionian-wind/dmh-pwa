<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import DiceBox from '@3d-dice/dice-box';
import { IconX } from '@tabler/icons-vue';

const emit = defineEmits<{ (event: 'close'): void }>();
const { t } = useI18n();

const dice = [
  { label: 'd2', notation: '1d2' },
  { label: 'd4', notation: '1d4' },
  { label: 'd6', notation: '1d6' },
  { label: 'd8', notation: '1d8' },
  { label: 'd10', notation: '1d10' },
  { label: 'd12', notation: '1d12' },
  { label: 'd20', notation: '1d20' },
  { label: 'd100', notation: '2d10' },
];

const surface = ref<HTMLDivElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const ready = ref(false);
const position = ref({ x: 0, y: 0 });
const pool = ref<Record<string, number>>({});
let diceBox: any;
let drag: { offsetX: number; offsetY: number } | null = null;

function clampPosition(x: number, y: number) {
  const element = panel.value;
  const width = element?.offsetWidth ?? 180;
  const height = element?.offsetHeight ?? 360;
  return {
    x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - width)),
    y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - height)),
  };
}

function placePanel() {
  if (!panel.value) return;
  position.value = clampPosition(
    24,
    window.innerHeight - panel.value.offsetHeight - 24,
  );
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  drag = {
    offsetX: event.clientX - position.value.x,
    offsetY: event.clientY - position.value.y,
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopDragging, { once: true });
}

function onPointerMove(event: PointerEvent) {
  if (!drag) return;
  position.value = clampPosition(
    event.clientX - drag.offsetX,
    event.clientY - drag.offsetY,
  );
}

function stopDragging() {
  drag = null;
  window.removeEventListener('pointermove', onPointerMove);
}

function resizeSurface() {
  if (surface.value) {
    surface.value.style.width = `${window.innerWidth}px`;
    surface.value.style.height = `${window.innerHeight}px`;
  }
  position.value = clampPosition(position.value.x, position.value.y);
}

function addDie(die: { label: string; notation: string }) {
  if (!ready.value || !diceBox) return;
  pool.value[die.label] = (pool.value[die.label] ?? 0) + 1;
  diceBox.add(die.notation);
}

function rollPool() {
  if (!ready.value || !diceBox) return;
  diceBox.clear();
  for (const die of dice) {
    const count = pool.value[die.label] ?? 0;
    for (let index = 0; index < count; index += 1) {
      diceBox.add(die.notation);
    }
  }
}

function clearDice() {
  pool.value = {};
  diceBox?.clear();
}

onMounted(async () => {
  placePanel();
  resizeSurface();
  window.addEventListener('resize', resizeSurface);

  diceBox = new DiceBox({
    container: '#dice-roller-surface',
    assetPath: '/dmh-pwa/assets/dice-box/',
    theme: 'default-extras',
    preloadThemes: ['default-extras'],
  });
  await diceBox.init();
  ready.value = true;
  resizeSurface();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeSurface);
  stopDragging();
  diceBox?.clear();
  diceBox = null;
});

const panelStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}));
</script>

<template>
  <Teleport to="body">
    <div
      id="dice-roller-surface"
      ref="surface"
      class="dice-roller-surface"
      aria-hidden="true"
    />
    <section
      ref="panel"
      class="dice-roller-panel"
      :style="panelStyle"
      :aria-label="t('diceRoller.title')"
    >
      <header class="dice-roller-header" @pointerdown="onPointerDown">
        <span>{{ t('diceRoller.title') }}</span>
        <button
          type="button"
          class="dice-roller-close"
          :aria-label="t('diceRoller.close')"
          @click="emit('close')"
        >
          <IconX :size="16" />
        </button>
      </header>

      <div class="dice-roller-buttons">
        <button
          v-for="die in dice"
          :key="die.label"
          type="button"
          class="dice-roller-button"
          :disabled="!ready"
          :aria-label="die.label"
          @click="addDie(die)"
        >
          <span>{{ die.label }}</span>
          <span v-if="pool[die.label]" class="dice-roller-count">
            ×{{ pool[die.label] }}
          </span>
        </button>
      </div>

      <div class="dice-roller-separator" role="separator" />

      <button
        type="button"
        class="dice-roller-button dice-roller-clear"
        :disabled="!ready"
        @click="clearDice"
      >
        {{ t('diceRoller.clear') }}
      </button>
      <button
        type="button"
        class="dice-roller-button"
        :disabled="!ready"
        @click="rollPool"
      >
        {{ t('diceRoller.reroll') }}
      </button>
    </section>
  </Teleport>
</template>

<style scoped>
.dice-roller-surface {
  position: fixed;
  inset: 0;
  z-index: 900;
  pointer-events: none;
  overflow: hidden;
}

.dice-roller-surface :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.dice-roller-panel {
  position: fixed;
  z-index: 1100;
  width: 132px;
  padding: 8px;
  border: 1px solid var(--color-border, #555);
  border-radius: 10px;
  background: var(--q-dark, #1e1e1e);
  color: var(--color-text, #fff);
  box-shadow: 0 12px 32px rgb(0 0 0 / 45%);
  user-select: none;
}

.dice-roller-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: grab;
  touch-action: none;
}

.dice-roller-header:active {
  cursor: grabbing;
}

.dice-roller-close {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.dice-roller-close:hover {
  background: rgb(255 255 255 / 12%);
}

.dice-roller-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dice-roller-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 6px;
  background: rgb(255 255 255 / 8%);
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.dice-roller-button:hover:not(:disabled) {
  background: rgb(255 255 255 / 16%);
}

.dice-roller-button:disabled {
  opacity: 0.45;
  cursor: wait;
}

.dice-roller-separator {
  height: 1px;
  margin: 8px 2px;
  background: rgb(255 255 255 / 18%);
}

.dice-roller-clear {
  margin-top: 2px;
}

.dice-roller-count {
  font-size: 11px;
  opacity: 0.7;
}
</style>
