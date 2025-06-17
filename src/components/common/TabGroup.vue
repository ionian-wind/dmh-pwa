<script setup lang="ts">
import { ref, computed, watch } from 'vue';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  badge?: string | number;
}

const props = defineProps<{
  tabs: Tab[];
  modelValue?: string;
  variant?: 'default' | 'pills' | 'underline' | 'cards';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  vertical?: boolean;
  closable?: boolean;
  addable?: boolean;
  disableTransition?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'tab-click', tab: Tab): void;
  (e: 'tab-close', tabId: string): void;
  (e: 'tab-add'): void;
}>();

const activeTab = computed({
  get: () => props.modelValue || props.tabs[0]?.id || '',
  set: (value: string) => {
    if (value !== props.modelValue) {
      emit('update:modelValue', value);
    }
  }
});

const activeTabData = computed(() => 
  props.tabs.find(tab => tab.id === activeTab.value)
);

const handleTabClick = (tab: Tab) => {
  if (tab.disabled) return;
  if (tab.id !== activeTab.value) {
    activeTab.value = tab.id;
    emit('tab-click', tab);
  }
};

const handleTabClose = (tabId: string, event: Event) => {
  event.stopPropagation();
  emit('tab-close', tabId);
};

const handleAddTab = () => {
  emit('tab-add');
};

// Auto-select first non-disabled tab if current tab is disabled
watch(() => props.tabs, (newTabs) => {
  if (newTabs.length > 0 && !newTabs.find(tab => tab.id === activeTab.value)) {
    const firstEnabledTab = newTabs.find(tab => !tab.disabled);
    if (firstEnabledTab) {
      activeTab.value = firstEnabledTab.id;
    }
  }
}, { immediate: true });
</script>

<template>
  <div class="tab-group" :class="[
    `tab-group--${variant || 'default'}`,
    `tab-group--${size || 'md'}`,
    { 'tab-group--full-width': fullWidth },
    { 'tab-group--vertical': vertical }
  ]">
    <!-- Tab Navigation -->
    <div class="tab-nav" :class="`tab-nav--${variant || 'default'}`">
      <div class="tab-list">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-item"
          :class="[
            `tab-item--${variant || 'default'}`,
            { 'tab-item--active': tab.id === activeTab },
            { 'tab-item--disabled': tab.disabled }
          ]"
          @click="handleTabClick(tab)"
          :disabled="tab.disabled"
        >
          <span v-if="tab.icon" class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
          <button
            v-if="closable && !tab.disabled"
            class="tab-close"
            @click="handleTabClose(tab.id, $event)"
            title="Close tab"
          >
            ×
          </button>
        </button>
      </div>
      
      <button
        v-if="addable"
        class="tab-add"
        @click="handleAddTab"
        title="Add new tab"
      >
        +
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <div class="tab-panel">
        <Transition v-if="!disableTransition" name="tab-fade" mode="out-in">
          <div :key="activeTab" class="tab-panel-content">
            <slot :active-tab="activeTab" :active-tab-data="activeTabData">
              <!-- Default slot content -->
            </slot>
          </div>
        </Transition>
        <div v-else :key="activeTab" class="tab-panel-content">
          <slot :active-tab="activeTab" :active-tab-data="activeTabData">
            <!-- Default slot content -->
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-group {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.tab-group--vertical {
  flex-direction: row;
}

.tab-group--full-width .tab-nav {
  width: 100%;
}

.tab-group--sm .tab-item {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.tab-group--md .tab-item {
  padding: 0.75rem 1rem;
  font-size: 1rem;
}

.tab-group--lg .tab-item {
  padding: 1rem 1.25rem;
  font-size: 1.125rem;
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.tab-group--vertical .tab-nav {
  flex-direction: column;
  border-bottom: none;
  border-right: 1px solid var(--color-border);
  min-width: 200px;
}

.tab-list {
  display: flex;
  flex: 1;
  overflow-x: auto;
}

.tab-group--vertical .tab-list {
  flex-direction: column;
  overflow-x: visible;
  overflow-y: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-light);
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
}

.tab-item:hover:not(.tab-item--disabled) {
  color: var(--color-text);
  background: var(--color-background);
}

.tab-item--active {
  color: var(--color-primary);
  background: var(--color-background);
}

.tab-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Default variant */
.tab-nav--default .tab-item--active {
  border-bottom: 2px solid var(--color-primary);
}

.tab-group--vertical .tab-nav--default .tab-item--active {
  border-bottom: none;
  border-right: 2px solid var(--color-primary);
}

/* Pills variant */
.tab-nav--pills {
  border-bottom: none;
  gap: 0.5rem;
  padding: 0.5rem;
}

.tab-nav--pills .tab-item {
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.tab-nav--pills .tab-item--active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

/* Underline variant */
.tab-nav--underline {
  border-bottom: 2px solid var(--color-border);
}

.tab-nav--underline .tab-item--active {
  border-bottom: 2px solid var(--color-primary);
  margin-bottom: -2px;
}

/* Cards variant */
.tab-nav--cards {
  border-bottom: none;
  gap: 0.25rem;
  padding: 0.5rem;
}

.tab-nav--cards .tab-item {
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-nav--cards .tab-item--active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Tab elements */
.tab-icon {
  font-size: 1.1em;
}

.tab-label {
  font-weight: 500;
}

.tab-badge {
  background: var(--color-primary);
  color: white;
  border-radius: 9999px;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.25rem;
  text-align: center;
}

.tab-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.125rem;
  border-radius: 50%;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.tab-close:hover {
  background: rgba(0, 0, 0, 0.1);
  opacity: 1;
}

.tab-add {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: bold;
  margin-left: 0.5rem;
  transition: all 0.2s ease;
}

.tab-add:hover {
  background: var(--color-primary-dark);
  transform: scale(1.05);
}

.tab-group--vertical .tab-add {
  margin-left: 0;
  margin-top: 0.5rem;
}

/* Tab Content */
.tab-content {
  flex: 1;
  padding: 1rem;
  background: var(--color-background);
}

.tab-group--vertical .tab-content {
  padding-left: 1.5rem;
}

.tab-panel {
  width: 100%;
}

/* Tab transition animations */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.tab-panel-content {
  width: 100%;
}
</style> 