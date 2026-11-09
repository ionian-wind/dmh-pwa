<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { IconX } from '@tabler/icons-vue';
import type {
  DiceRenderer,
  DiceResult,
  DiceVisual,
} from '@/features/dice-roller/renderer/DiceRenderer';
import { DiceBoxRenderer } from '@/features/dice-roller/renderer/DiceBoxRenderer';
import { ThreeDiceRenderer } from '@/features/dice-roller/renderer/ThreeDiceRenderer';
import { supportsWebGL } from '@/features/dice-roller/renderer/factory';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();
const { t } = useI18n();

const dice = [
  { label: 'd2', notation: '1d2', sides: 2 },
  { label: 'd4', notation: '1d4', sides: 4 },
  { label: 'd6', notation: '1d6', sides: 6 },
  { label: 'd8', notation: '1d8', sides: 8 },
  { label: 'd10', notation: '1d10', sides: 10 },
  { label: 'd12', notation: '1d12', sides: 12 },
  { label: 'd20', notation: '1d20', sides: 20 },
  { label: 'd100', notation: '1d100', sides: 100 },
];

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const surface = ref<HTMLDivElement | null>(null);
const anchor = ref<HTMLDivElement | null>(null);
const menu = ref<{ updatePosition?: () => void } | null>(null);
const ready = ref(false);
const rollError = ref(false);
const pool = ref<Record<string, number>>({});
const hover = ref<{ result: DiceResult; x: number; y: number } | null>(null);
const anchorStyle = ref({ left: '0px', top: '0px' });
let renderer: DiceRenderer | null = null;
let resizeObserver: ResizeObserver | undefined;
let dragged = false;
let visualCounter = 0;
let drag: {
  startX: number;
  startY: number;
  left: number;
  top: number;
} | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function placeBesideMenu() {
  const mainMenu = document.getElementById('main_menu');
  const right = mainMenu?.getBoundingClientRect().right ?? 56;
  anchorStyle.value = {
    left: `${clamp(right + 12, 0, window.innerWidth)}px`,
    top: `${Math.max(0, window.innerHeight - 16)}px`,
  };
  void nextTick(() => menu.value?.updatePosition?.());
}

function sizeSurface() {
  if (!surface.value) return;
  surface.value.style.width = `${window.innerWidth}px`;
  surface.value.style.height = `${window.innerHeight}px`;
}

function onWindowResize() {
  sizeSurface();
  renderer?.resize(window.innerWidth, window.innerHeight);
  if (!dragged) {
    placeBesideMenu();
  } else {
    const left = Number.parseFloat(anchorStyle.value.left);
    const top = Number.parseFloat(anchorStyle.value.top);
    anchorStyle.value = {
      left: `${clamp(left, 0, window.innerWidth)}px`,
      top: `${clamp(top, 0, window.innerHeight)}px`,
    };
    void nextTick(() => menu.value?.updatePosition?.());
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  hover.value = null;
  drag = {
    startX: event.clientX,
    startY: event.clientY,
    left: Number.parseFloat(anchorStyle.value.left),
    top: Number.parseFloat(anchorStyle.value.top),
  };
  dragged = true;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopDragging, { once: true });
}

function onPointerMove(event: PointerEvent) {
  if (!drag) return;
  anchorStyle.value = {
    left: `${clamp(
      drag.left + event.clientX - drag.startX,
      0,
      window.innerWidth,
    )}px`,
    top: `${clamp(
      drag.top + event.clientY - drag.startY,
      0,
      window.innerHeight,
    )}px`,
  };
  void nextTick(() => menu.value?.updatePosition?.());
}

function stopDragging() {
  drag = null;
  window.removeEventListener('pointermove', onPointerMove);
}

function onHoverMove(event: PointerEvent) {
  if (drag || !renderer) {
    hover.value = null;
    return;
  }
  const result = renderer.pick(event.clientX, event.clientY);
  hover.value = result
    ? { result, x: event.clientX + 14, y: event.clientY + 14 }
    : null;
}

function clearHover() {
  hover.value = null;
}

function makeVisual(die: (typeof dice)[number]): DiceVisual {
  visualCounter += 1;
  return {
    id: `die-${visualCounter}`,
    sides: die.sides,
    notation: die.notation,
    label: die.label,
  };
}

function addDie(die: (typeof dice)[number]) {
  if (!ready.value || !renderer) return;
  pool.value[die.label] = (pool.value[die.label] ?? 0) + 1;
  try {
    renderer.add([makeVisual(die)]);
    rollError.value = false;
  } catch {
    // Keep the pool so the next reroll can recover.
    rollError.value = true;
  }
}

function poolVisuals(): DiceVisual[] {
  const visuals: DiceVisual[] = [];
  for (const die of dice) {
    const count = pool.value[die.label] ?? 0;
    for (let index = 0; index < count; index += 1) {
      visuals.push(makeVisual(die));
    }
  }
  return visuals;
}

function rollPool() {
  if (!ready.value || !renderer) return;
  try {
    hover.value = null;
    renderer.replace(poolVisuals());
    rollError.value = false;
  } catch {
    rollError.value = true;
  }
}

function clearDice() {
  pool.value = {};
  rollError.value = false;
  hover.value = null;
  renderer?.clear();
}

async function createRenderer(): Promise<DiceRenderer> {
  if (supportsWebGL()) {
    const { ThreeDiceRenderer } =
      await import('@/features/dice-roller/renderer/ThreeDiceRenderer');
    const primary = new ThreeDiceRenderer();
    try {
      await startRenderer(primary);
      return primary;
    } catch {
      primary.dispose();
    }
  }

  const { DiceBoxRenderer } =
    await import('@/features/dice-roller/renderer/DiceBoxRenderer');
  const fallback = new DiceBoxRenderer();
  await startRenderer(fallback);
  return fallback;
}

async function startRenderer(candidate: DiceRenderer): Promise<void> {
  if (!surface.value) throw new Error('dice surface missing');
  await candidate.init(surface.value, {
    assetPath: '/dmh-pwa/assets/dice-box/',
    theme: 'default-extras',
    reducedMotion:
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
}

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      void nextTick(() => {
        placeBesideMenu();
        menu.value?.updatePosition?.();
      });
    }
  },
);

onMounted(async () => {
  placeBesideMenu();
  sizeSurface();
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('pointermove', onHoverMove);
  window.addEventListener('pointerleave', clearHover);
  const mainMenu = document.getElementById('main_menu');
  if (mainMenu && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (!dragged) placeBesideMenu();
    });
    resizeObserver.observe(mainMenu);
  }

  try {
    renderer = await createRenderer();
    ready.value = true;
  } catch {
    rollError.value = true;
    ready.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('pointermove', onHoverMove);
  window.removeEventListener('pointerleave', clearHover);
  resizeObserver?.disconnect();
  stopDragging();
  renderer?.dispose();
  renderer = null;
});
</script>

<template>
  <Teleport to="body">
    <div
      id="dice-roller-surface"
      ref="surface"
      class="dice-roller-surface"
      aria-hidden="true"
    />
    <div ref="anchor" class="dice-roller-anchor" :style="anchorStyle">
      <QMenu
        ref="menu"
        v-model="open"
        anchor="bottom left"
        self="bottom left"
        :offset="[0, 0]"
        :persistent="true"
        :auto-close="false"
        no-parent-event
        class="dice-roller-menu"
      >
        <QList dense>
          <QItem class="dice-roller-header" @pointerdown="onPointerDown">
            <QItemSection>{{ t('diceRoller.title') }}</QItemSection>
            <QItemSection side>
              <QBtn
                flat
                dense
                round
                :aria-label="t('diceRoller.close')"
                @pointerdown.stop
                @click.stop="open = false"
              >
                <IconX :size="16" />
              </QBtn>
            </QItemSection>
          </QItem>
          <QSeparator />

          <QItem
            v-for="die in dice"
            :key="die.label"
            clickable
            :disable="!ready"
            class="dice-roller-item"
            @click="addDie(die)"
          >
            <QItemSection class="dice-roller-label">{{
              die.label
            }}</QItemSection>
            <QItemSection v-if="pool[die.label]" side>
              <QBadge color="primary" rounded>×{{ pool[die.label] }}</QBadge>
            </QItemSection>
          </QItem>

          <QSeparator />

          <QItem v-if="rollError" class="dice-roller-error">
            <QItemSection>{{ t('diceRoller.rollError') }}</QItemSection>
          </QItem>

          <QItem
            clickable
            :disable="!ready"
            class="dice-roller-item"
            @click="clearDice"
          >
            <QItemSection>{{ t('diceRoller.clear') }}</QItemSection>
          </QItem>
          <QItem
            clickable
            :disable="!ready"
            class="dice-roller-item"
            @click="rollPool"
          >
            <QItemSection>{{ t('diceRoller.reroll') }}</QItemSection>
          </QItem>
        </QList>
      </QMenu>
    </div>
    <div
      v-if="hover"
      class="dice-roller-tooltip"
      :style="{ left: `${hover.x}px`, top: `${hover.y}px` }"
    >
      d{{ hover.result.sides }}: {{ hover.result.value }}
    </div>
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

.dice-roller-anchor {
  position: fixed;
  width: 0;
  height: 0;
  pointer-events: none;
}

.dice-roller-menu {
  min-width: 144px;
}

.dice-roller-header {
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.dice-roller-header:active {
  cursor: grabbing;
}

.dice-roller-label {
  font-weight: 600;
}

.dice-roller-tooltip {
  position: fixed;
  z-index: 1001;
  pointer-events: none;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(24, 24, 24, 0.92);
  color: #fff;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
</style>
