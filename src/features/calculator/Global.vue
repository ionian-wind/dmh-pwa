<script setup lang="ts">
import CalculatorDialog from '@/calculator/CalculatorView.vue';
import { calculatorOpen } from './state';
</script>

<template>
  <CalculatorDialog v-model="calculatorOpen" />
</template>
