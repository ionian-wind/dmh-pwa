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
import DiceBox from '@3d-dice/dice-box';
import { IconX } from '@tabler/icons-vue';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();
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

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const surface = ref<HTMLDivElement | null>(null);
const anchor = ref<HTMLDivElement | null>(null);
const menu = ref<{ updatePosition?: () => void } | null>(null);
const ready = ref(false);
const pool = ref<Record<string, number>>({});
const anchorStyle = ref({ left: '0px', top: '0px' });
let diceBox: any;
let resizeObserver: ResizeObserver | undefined;
let dragged = false;
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

function resizeSurface() {
  if (surface.value) {
    surface.value.style.width = `${window.innerWidth}px`;
    surface.value.style.height = `${window.innerHeight}px`;
  }
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
  resizeSurface();
  window.addEventListener('resize', resizeSurface);
  const mainMenu = document.getElementById('main_menu');
  if (mainMenu && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (!dragged) placeBesideMenu();
    });
    resizeObserver.observe(mainMenu);
  }

  diceBox = new DiceBox({
    container: '#dice-roller-surface',
    assetPath: '/dmh-pwa/assets/dice-box/',
    theme: 'default-extras',
    preloadThemes: ['default-extras'],
    // On-screen rendering preserves the existing dice scene through resizes.
    // The offscreen worker path recreates its surface and can leave it blank.
    offscreen: false,
  });
  await diceBox.init();
  ready.value = true;
  resizeSurface();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeSurface);
  resizeObserver?.disconnect();
  stopDragging();
  diceBox?.clear();
  diceBox = null;
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
</style>
