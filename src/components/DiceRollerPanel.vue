<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import DiceBox from '@3d-dice/dice-box';

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
const ready = ref(false);
const pool = ref<Record<string, number>>({});
let diceBox: any;

function resizeSurface() {
  if (!surface.value) return;
  surface.value.style.width = `${window.innerWidth}px`;
  surface.value.style.height = `${window.innerHeight}px`;
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
  </Teleport>

  <QList dense class="dice-roller-list">
    <QItem
      v-for="die in dice"
      :key="die.label"
      clickable
      :disable="!ready"
      class="dice-roller-item"
      @click="addDie(die)"
    >
      <QItemSection class="dice-roller-label">{{ die.label }}</QItemSection>
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

.dice-roller-list {
  min-width: 132px;
}

.dice-roller-label {
  font-weight: 600;
}
</style>
