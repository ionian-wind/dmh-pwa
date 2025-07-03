<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { evaluate } from 'mathjs';
import { IconParentheses, IconPercentage, IconDivide, IconX, IconMinus, IconPlus, IconBackspace, IconEqual } from '@tabler/icons-vue'
import Button from '@/components/form/Button.vue';

const input = ref('');
const result = ref('');
const error = ref('');

const replaceMap = new Map([
  ['/', '÷'],
  ['*', '×']
])

function append(val: string) {
  error.value = '';
  input.value += replaceMap.get(val) ?? val;
}

function applyInputAliases(expr: string): string {
  let result = expr;
  
  replaceMap.forEach((alias, target) => {
    result = result.split(alias).join(target);
  });
  console.log(result);
  return result;
}

function clear() {
  input.value = '';
  result.value = '';
  error.value = '';
}

function calculate() {
  try {
    // Apply symbol aliases for math.js compatibility
    const expr = applyInputAliases(input.value);
    result.value = String(evaluate(expr));
    error.value = '';
  } catch (e: any) {
    result.value = '';
    error.value = e.message || 'Error';
  }
}

function handleKey(e: KeyboardEvent) {
  e.preventDefault()
  if (e.key.match(/[0-9\+\-\*\/\.\(\)]/)) {
    append(e.key);
  } else if (e.key === 'Enter' || e.key === '=') {
    calculate();
  } else if (e.key === 'Backspace') {
    input.value = input.value.slice(0, -1);
  } else if (e.key.toLowerCase() === 'c') {
    clear();
  }
}

function appendBrace() {
  const trimmed = input.value.trim();
  const lastChar = trimmed[trimmed.length - 1];
  if (['+', '-', '*', '/'].includes(lastChar)) {
    append('(');
    return;
  }
  const open = (input.value.match(/\(/g) || []).length;
  const close = (input.value.match(/\)/g) || []).length;
  if (open <= close) {
    append('(');
  } else {
    append(')');
  }
}

function backspace() {
  input.value = input.value.slice(0, -1);
}

onMounted(() => window.addEventListener('keydown', handleKey));
onUnmounted(() => window.removeEventListener('keydown', handleKey));
</script>

<template>
  <div class="calculator-view">
    <div class="calculator-display">
      <div class="calculator-input">{{ input || '0' }}</div>
      <div class="calculator-result" aria-live="polite">{{ result ? '= ' + result : '\u00A0' }}</div>
      <div class="calculator-error" v-if="error">{{ error }}</div>
    </div>
    <div class="calculator-buttons">
      <Button class="operation" variant="light" @click="clear">AC</Button>
      <Button class="operation" variant="light" @click="appendBrace"><IconParentheses /></Button>
      <Button class="operation" variant="light" @click="append('%')"><IconPercentage /></Button>
      <Button class="operation" variant="light" @click="append('÷')"><IconDivide /></Button>

      <Button variant="light" @click="append('7')">7</Button>
      <Button variant="light" @click="append('8')">8</Button>
      <Button variant="light" @click="append('9')">9</Button>
      <Button class="operation" variant="light" @click="append('×')"><IconX /> </Button>

      <Button variant="light" @click="append('4')">4</Button>
      <Button variant="light" @click="append('5')">5</Button>
      <Button variant="light" @click="append('6')">6</Button>
      <Button class="operation" variant="light" @click="append('-')"><IconMinus /></Button>
      
      <Button variant="light" @click="append('1')">1</Button>
      <Button variant="light" @click="append('2')">2</Button>
      <Button variant="light" @click="append('3')">3</Button>
      <Button class="operation" variant="light" @click="append('+')"><IconPlus /></Button>
      
      <Button variant="light" @click="append('0')">0</Button>
      <Button variant="light" @click="append('.')">.</Button>

      <Button class="control" variant="light" @click="backspace"><IconBackspace /></Button>
      <Button class="control" variant="light" @click="calculate"><IconEqual /></Button>
    </div>
  </div>
</template>

<style scoped>
.calculator-view {
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.calculator-display {
  width: 100%;
  margin-bottom: 1rem;
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 1rem;
  min-height: 60px;
  box-sizing: border-box;
}
.calculator-input {
  font-size: 1.3rem;
  color: var(--color-text);
  word-break: break-all;
}
.calculator-result {
  font-size: 1.1rem;
  color: var(--color-success);
  margin-top: 0.2rem;
}
.calculator-error {
  font-size: 1.1rem;
  color: var(--color-danger);
  margin-top: 0.2rem;
}
.calculator-buttons {
  display: grid;
  grid-template-columns: repeat(4, 60px);
  gap: 0.5rem;
}
.operation {
  background-color: var(--color-info-light);
}
.control {
  background-color: var(--color-misc-light);
}
</style> 
