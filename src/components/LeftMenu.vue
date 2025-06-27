<script setup lang="ts">
import { ref, computed, onMounted, defineProps, defineEmits } from 'vue';
import { useRouter } from 'vue-router';
import { Section } from '@/types';
import { useI18n } from 'vue-i18n';
import { useModuleStore } from '@/stores/modules';
import { useConfigStore } from '@/utils/configStore';
import Button from '@/components/common/Button.vue';

const props = defineProps<{ minimized: boolean | { value: boolean } }>();
const emit = defineEmits(['toggle']);

const { t } = useI18n();
const router = useRouter();
const moduleStore = useModuleStore();
const configStore = useConfigStore();

const moduleOptions = computed(() => [
  { id: 'any', name: 'Any Module', value: 'any' },
  { id: 'none', name: 'No Module', value: 'none' },
  ...moduleStore.items.map(({ id, name }) => ({ id, name, value: id }))
]);

const currentModuleFilter = computed({
  get: () => configStore.currentModuleFilter?.value || 'none',
  set: (value: string) => {
    configStore.currentModuleFilter.value = value;
  }
});

function toggleMenu() {
  emit('toggle');
}

function isMinimized() {
  return typeof props.minimized === 'object' ? props.minimized.value : props.minimized;
}
</script>

<template>
  <aside :class="['left-menu', { minimized: isMinimized() }]">
    <div class="toggle-btn" @click="toggleMenu">
      <i :class="isMinimized() ? 'si si-chevron-right' : 'si si-chevron-left'" />
    </div>
    <div class="module-selector-row">
      <div class="module-selector">
        <select v-model="currentModuleFilter" :disabled="isMinimized()">
          <option v-for="module in moduleOptions" :key="module.id" :value="module.value">
            {{ module.name }}
          </option>
        </select>
      </div>
      <Button 
        variant="danger"
        size="small"
        class="clear-module-btn"
        @click="currentModuleFilter = 'none'"
        v-if="currentModuleFilter !== 'none' && !isMinimized()"
        :title="t('app.clear')"
      >
        <i class="si si-x"></i>
      </Button>
    </div>
    <nav class="menu-items">
      <slot name="navigation" />
    </nav>
    <div class="left-menu-bottom">
      <slot name="bottom" />
    </div>
  </aside>
</template>

<style scoped>
.left-menu {
  height: 100vh;
  width: 220px;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-shadow: 2px 0 8px rgba(0,0,0,0.08);
  transition: width 0.2s;
}
.left-menu.minimized {
  width: 60px;
}
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 1rem 1rem 0.5rem;
  cursor: pointer;
  color: var(--color-text-inverse);
  font-size: 1.2rem;
}
.module-selector-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 1rem 1rem 1rem;
}
.module-selector {
  flex: 1;
}
.module-selector select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
}
.clear-module-btn {
  background: none;
  border: none;
  color: var(--color-text-inverse);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1rem;
}
.clear-module-btn:hover {
  color: var(--color-danger);
}

.left-menu.minimized .menu-label {
  display: none;
}
.left-menu.minimized {
  align-items: center;
}
.left-menu.minimized .module-selector-row {
  display: none;
}
.left-menu-bottom {
  margin-top: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
</style> 