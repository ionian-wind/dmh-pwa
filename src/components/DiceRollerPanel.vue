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
  DieKind,
  ExplodeMode,
} from '@/features/dice-roller/renderer/DiceRenderer';
import { PLAY_BOUNDS } from '@/features/dice-roller/renderer/DiceRenderer';
import {
  createDieRollEvent,
  createPoolRollEvent,
  dispatchRollEvent,
  type DiceRollEvent,
  type RollEventDie,
} from '@/utils/roll-events';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'roll', value: DiceRollEvent): void;
}>();
const { t } = useI18n();

interface DiceRow {
  label: string;
  sides: number;
  notation: string;
  kind?: DieKind;
}

const diceRows: DiceRow[] = [
  { label: 'd2', sides: 2, notation: '1d2' },
  { label: 'd4', sides: 4, notation: '1d4' },
  { label: 'd6', sides: 6, notation: '1d6' },
  { label: 'd8', sides: 8, notation: '1d8' },
  { label: 'd10', sides: 10, notation: '1d10' },
  { label: 'd12', sides: 12, notation: '1d12' },
  { label: 'd20', sides: 20, notation: '1d20' },
  { label: 'd100', sides: 100, notation: '1d100' },
  { label: 'FUDGE', sides: 3, notation: '1dF', kind: 'fate' },
];

const counts = [2, 3, 4, 5];
const explodeModes: ExplodeMode[] = ['!', '!!', '!p'];
const explodeHints: Record<ExplodeMode, string> = {
  '!': 'diceRoller.explodeHints.exploding',
  '!!': 'diceRoller.explodeHints.compounding',
  '!p': 'diceRoller.explodeHints.penetrating',
};

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const surface = ref<HTMLDivElement | null>(null);
const anchor = ref<HTMLDivElement | null>(null);
const menu = ref<{ updatePosition?: () => void } | null>(null);
const ready = ref(false);
const rollError = ref(false);
const total = ref<number | null>(null);
const mode = ref<ExplodeMode | null>(null);
const pool = ref<
  Array<{ row: DiceRow; count: number; mode: ExplodeMode | null }>
>([]);
const hover = ref<{ result: DiceResult; x: number; y: number } | null>(null);
const anchorStyle = ref({ left: '0px', top: '0px' });
let renderer: DiceRenderer | null = null;
let resizeObserver: ResizeObserver | undefined;
let dragged = false;
let dieDrag = false;
let visualCounter = 0;
let rollCounter = 0;
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
  if (drag || dieDrag || !renderer) {
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

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      '.dice-roller-anchor, .dice-roller-menu, button, a, input, textarea, select, [role="button"], .q-item',
    ),
  );
}

function onDieDragMove(event: PointerEvent) {
  if (!dieDrag) return;
  hover.value = null;
  renderer?.dragTo(event.clientX, event.clientY);
}

function onDieDragEnd() {
  if (!dieDrag) return;
  dieDrag = false;
  renderer?.endDrag();
  window.removeEventListener('pointermove', onDieDragMove);
  window.removeEventListener('pointercancel', onDieDragEnd);
}

function onSurfacePointerDown(event: PointerEvent) {
  if (event.button !== 0 || dieDrag || !renderer) return;
  if (isInteractiveTarget(event.target)) return;
  if (!renderer.beginDrag(event.clientX, event.clientY)) return;
  dieDrag = true;
  hover.value = null;
  event.preventDefault();
  event.stopPropagation();
  window.addEventListener('pointermove', onDieDragMove);
  window.addEventListener('pointerup', onDieDragEnd, { once: true });
  window.addEventListener('pointercancel', onDieDragEnd, { once: true });
}

function toggleMode(value: ExplodeMode) {
  mode.value = mode.value === value ? null : value;
}

function makeVisuals(
  row: DiceRow,
  count: number,
  batchMode: ExplodeMode | null,
): DiceVisual[] {
  rollCounter += 1;
  const prefix = `roll-${rollCounter}`;
  return Array.from({ length: count }, (_, index) => {
    visualCounter += 1;
    return {
      id: `${prefix}-${index}-${visualCounter}`,
      sides: row.sides,
      notation: row.notation,
      label: row.label,
      ...(row.kind ? { kind: row.kind } : {}),
      ...(batchMode ? { explode: batchMode } : {}),
    };
  });
}

function roll(row: DiceRow, count: number) {
  if (!ready.value || !renderer) return;
  pool.value.push({ row, count, mode: mode.value });
  total.value = null;
  hover.value = null;
  try {
    // Add to the existing tray so several grid presses build a pool.
    renderer.add(makeVisuals(row, count, mode.value));
    rollError.value = false;
  } catch {
    rollError.value = true;
  }
}

function reroll() {
  if (!renderer || pool.value.length === 0) return;
  total.value = null;
  hover.value = null;
  try {
    renderer.clear();
    for (const entry of pool.value) {
      renderer.add(makeVisuals(entry.row, entry.count, entry.mode));
    }
    rollError.value = false;
  } catch {
    rollError.value = true;
  }
}

function clearDice() {
  total.value = null;
  pool.value = [];
  rollError.value = false;
  hover.value = null;
  renderer?.clear();
}

async function createRenderer(): Promise<DiceRenderer> {
  const { supportsWebGL } =
    await import('@/features/dice-roller/renderer/DiceRenderer');
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
    onSettled: (results) => {
      total.value = results.reduce((sum, result) => sum + result.value, 0);
      if (results.length === 0) return;

      const createdAt = Date.now();
      const dice: RollEventDie[] = results.map((result) => ({
        id: result.id,
        sides: result.sides,
        ...(result.kind ? { kind: result.kind } : {}),
        value: result.value,
        ...(result.label ? { label: result.label } : {}),
        ...(result.notation ? { notation: result.notation } : {}),
        ...(result.explode ? { explode: result.explode } : {}),
        ...(result.isExtra ? { isExtra: true } : {}),
        ...(result.penalty !== undefined ? { penalty: result.penalty } : {}),
        ...(result.rootId ? { rootId: result.rootId } : {}),
      }));

      for (const die of dice) {
        const event = createDieRollEvent(die, { createdAt });
        emit('roll', event);
        dispatchRollEvent(event);
      }

      const modes = new Set(results.map((result) => result.explode ?? null));
      const mode =
        modes.size === 1 ? (results[0].explode ?? undefined) : undefined;
      const raw = pool.value
        .map((entry) => {
          const sides =
            entry.row.kind === 'fate' ? 'F' : String(entry.row.sides);
          return `${entry.count}d${sides}${entry.mode ?? ''}`;
        })
        .join(' + ');
      const poolEvent = createPoolRollEvent(dice, {
        createdAt,
        ...(raw ? { raw } : {}),
        ...(mode ? { mode } : {}),
      });
      emit('roll', poolEvent);
      dispatchRollEvent(poolEvent);

      if (import.meta.env.DEV) {
        console.debug('[dice-roller] scene order', candidate.debugScene(), {
          bounds: PLAY_BOUNDS,
        });
      }
    },
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
  window.addEventListener('pointerdown', onSurfacePointerDown, true);
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
  window.removeEventListener('pointerdown', onSurfacePointerDown, true);
  window.removeEventListener('pointerleave', clearHover);
  onDieDragEnd();
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
        <div class="dice-roller-sheet">
          <div class="dice-roller-header" @pointerdown="onPointerDown">
            <span>{{ t('diceRoller.title') }}</span>
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
          </div>

          <div class="dice-roller-modes" role="group">
            <QBtn
              v-for="option in explodeModes"
              :key="option"
              flat
              dense
              no-caps
              class="dice-roller-mode"
              :class="{ active: mode === option }"
              :disable="!ready"
              :label="option"
              :title="t(explodeHints[option])"
              :aria-label="`${option}: ${t(explodeHints[option])}`"
              @click="toggleMode(option)"
            />
          </div>

          <div class="dice-roller-grid" role="grid">
            <div
              v-for="row in diceRows"
              :key="row.label"
              class="dice-roller-grid-row"
              role="row"
            >
              <QBtn
                flat
                dense
                no-caps
                class="dice-roller-row-label"
                :disable="!ready"
                :label="row.label"
                :aria-label="`${row.label} × 1`"
                @click="roll(row, 1)"
              />
              <QBtn
                v-for="count in counts"
                :key="count"
                flat
                dense
                no-caps
                class="dice-roller-cell"
                :disable="!ready"
                :label="String(count)"
                :aria-label="`${row.label} × ${count}`"
                @click="roll(row, count)"
              />
            </div>
          </div>

          <div class="dice-roller-footer">
            <span class="dice-roller-total">
              <template v-if="total !== null">Σ {{ total }}</template>
              <template v-else
                >{{
                  pool.reduce((count, entry) => count + entry.count, 0)
                }}
                dice</template
              >
            </span>
            <QBtn
              flat
              dense
              no-caps
              class="dice-roller-footer-button"
              :disable="!ready || pool.length === 0"
              :label="t('diceRoller.reroll')"
              @click="reroll"
            />
            <QBtn
              flat
              dense
              no-caps
              class="dice-roller-footer-button"
              :disable="!ready || pool.length === 0"
              :label="t('diceRoller.clear')"
              @click="clearDice"
            />
          </div>

          <div v-if="rollError" class="dice-roller-error">
            {{ t('diceRoller.rollError') }}
          </div>
        </div>
      </QMenu>
    </div>
    <div
      v-if="hover"
      class="dice-roller-tooltip"
      :style="{ left: `${hover.x}px`, top: `${hover.y}px` }"
    >
      {{ hover.result.label ?? `d${hover.result.sides}` }}:
      {{ hover.result.value }}
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
  min-width: 248px;
}

.dice-roller-sheet {
  padding: 8px;
}

.dice-roller-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 6px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  font-weight: 600;
}

.dice-roller-header:active {
  cursor: grabbing;
}

.dice-roller-modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}

.dice-roller-mode {
  border: 1px solid #c7c7c7;
  border-radius: 2px;
  font-weight: 700;
  min-height: 30px;
}

.dice-roller-mode.active {
  background: #4bb8e8;
  border-color: #2f9fd3;
  color: #12313d;
}

.dice-roller-grid {
  border-top: 1px solid #c7c7c7;
  border-left: 1px solid #c7c7c7;
}

.dice-roller-grid-row {
  display: grid;
  grid-template-columns: 1.4fr repeat(4, 1fr);
}

.dice-roller-row-label,
.dice-roller-cell {
  border-right: 1px solid #c7c7c7;
  border-bottom: 1px solid #c7c7c7;
  border-radius: 0;
  min-height: 30px;
}

.dice-roller-row-label {
  font-weight: 600;
  background: #faf9f7;
}

.dice-roller-cell:hover:not(:disabled),
.dice-roller-row-label:hover:not(:disabled) {
  background: #d9f2fd;
}

.dice-roller-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
}

.dice-roller-total {
  flex: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.dice-roller-footer-button {
  border: 1px solid #c7c7c7;
  border-radius: 2px;
  min-height: 28px;
}

.dice-roller-error {
  padding-top: 6px;
  color: #b3261e;
  font-size: 12px;
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
