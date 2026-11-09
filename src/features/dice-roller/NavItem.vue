<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconIcosahedron } from '@tabler/icons-vue';
import DiceRollerPanel from '@/components/DiceRollerPanel.vue';

const { t } = useI18n();
const open = ref(false);
</script>

<template>
  <QItem
    data-test="dice-roller-nav"
    clickable
    v-ripple
    :active="open"
    active-class="bg-secondary"
    :title="t('navigation.diceRoller')"
    :aria-label="t('navigation.diceRoller')"
    @click="open = !open"
  >
    <QItemSection side><IconIcosahedron /></QItemSection>
    <QItemSection>{{ t('navigation.diceRoller') }}</QItemSection>
  </QItem>
  <DiceRollerPanel v-model="open" />
</template>
