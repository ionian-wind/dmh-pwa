<script setup lang="ts">
import { ref } from 'vue';
import PopoverPanel from './PopoverPanel.vue';
import Button from './Button.vue';
import { useI18n } from 'vue-i18n';
import { IconUser } from '@tabler/icons-vue';

const { t } = useI18n();

const basicOpen = ref(false);
const hoverOpen = ref(false);
const titleOpen = ref(false);
const focusOpen = ref(false);
const noArrowOpen = ref(false);
const customOpen = ref(false);
const placementOpen = ref<string | null>(null);

const placements = [
  'top',
  'bottom', 
  'left',
  'right',
  'top-start',
  'top-end',
  'bottom-start',
  'bottom-end'
] as const;
</script>

<template>
  <div class="popover-demo">
    <h2>{{ t('popoverDemo.title') }}</h2>
    
    <div class="demo-section">
      <h3>{{ t('popoverDemo.basicClick') }}</h3>
      <PopoverPanel :is-open="basicOpen" @close="basicOpen = false">
        <template #trigger>
          <Button @click="basicOpen = !basicOpen">
            {{ t('popoverDemo.clickToOpen') }}
          </Button>
        </template>
        
        <div>
          <p>{{ t('popoverDemo.basicPopoverText') }}</p>
          <Button @click="basicOpen = false">{{ t('common.close') }}</Button>
        </div>
      </PopoverPanel>
    </div>

    <div class="demo-section">
      <h3>{{ t('popoverDemo.hoverTrigger') }}</h3>
      <PopoverPanel 
        :is-open="hoverOpen" 
        trigger="hover"
        placement="top"
        @open="hoverOpen = true"
        @close="hoverOpen = false"
      >
        <template #trigger>
          <span class="hover-trigger">{{ t('popoverDemo.hoverOverMe') }}</span>
        </template>
        
        <div>
          <h4>{{ t('popoverDemo.helpInformation') }}</h4>
          <p>{{ t('popoverDemo.hoverPopoverText') }}</p>
        </div>
      </PopoverPanel>
    </div>

    <div class="demo-section">
      <h3>{{ t('popoverDemo.withTitleAndPlacement') }}</h3>
      <PopoverPanel 
        :is-open="titleOpen" 
        :title="t('common.userMenu')"
        placement="bottom-end"
        :max-width="'250px'"
        @close="titleOpen = false"
      >
        <template #trigger>
          <Button @click="titleOpen = !titleOpen">
            <IconUser />
            {{ t('popoverDemo.profileMenu') }}
          </Button>
        </template>
        
        <div class="user-menu">
          <a href="#" class="menu-item">{{ t('popoverDemo.viewProfile') }}</a>
          <a href="#" class="menu-item">{{ t('popoverDemo.settings') }}</a>
          <a href="#" class="menu-item">{{ t('popoverDemo.help') }}</a>
          <a href="#" class="menu-item">{{ t('popoverDemo.logout') }}</a>
        </div>
      </PopoverPanel>
    </div>

    <div class="demo-section">
      <h3>{{ t('popoverDemo.focusTrigger') }}</h3>
      <PopoverPanel 
        :is-open="focusOpen" 
        trigger="focus"
        placement="bottom"
        :auto-focus="true"
        @open="focusOpen = true"
        @close="focusOpen = false"
      >
        <template #trigger>
          <input 
            type="text" 
            :placeholder="t('popoverDemo.searchPlaceholder')"
            class="search-input"
          />
        </template>
        
        <div class="search-results">
          <div class="search-item">{{ t('popoverDemo.searchResult1') }}</div>
          <div class="search-item">{{ t('popoverDemo.searchResult2') }}</div>
          <div class="search-item">{{ t('popoverDemo.searchResult3') }}</div>
        </div>
      </PopoverPanel>
    </div>

    <div class="demo-section">
      <h3>Different Placements</h3>
      <div class="placement-demo">
        <PopoverPanel 
          v-for="placement in placements" 
          :key="placement"
          :is-open="placementOpen === placement" 
          :placement="placement"
          @close="placementOpen = null"
        >
          <template #trigger>
            <Button @click="placementOpen = placementOpen === placement ? null : placement">
              {{ placement }}
            </Button>
          </template>
          
          <div>
            <p>This popover is positioned at: <strong>{{ placement }}</strong></p>
          </div>
        </PopoverPanel>
      </div>
    </div>

    <div class="demo-section">
      <h3>No Arrow</h3>
      <PopoverPanel 
        :is-open="noArrowOpen" 
        :show-arrow="false"
        @close="noArrowOpen = false"
      >
        <template #trigger>
          <Button @click="noArrowOpen = !noArrowOpen">
            No Arrow
          </Button>
        </template>
        
        <div>
          <p>This popover doesn't have an arrow indicator.</p>
        </div>
      </PopoverPanel>
    </div>

    <div class="demo-section">
      <h3>Custom Styling</h3>
      <PopoverPanel 
        :is-open="customOpen" 
        class="custom-popover"
        @close="customOpen = false"
      >
        <template #trigger>
          <Button @click="customOpen = !customOpen">
            Custom Style
          </Button>
        </template>
        
        <div>
          <p>This popover has custom styling applied.</p>
        </div>
      </PopoverPanel>
    </div>
  </div>
</template>

<style scoped>
.popover-demo {
  padding: var(--spacing-lg);
  max-width: 800px;
  margin: 0 auto;
}

.demo-section {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background-soft);
}

.demo-section h3 {
  margin-bottom: var(--spacing-md);
  color: var(--color-text);
}

.hover-trigger {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.hover-trigger:hover {
  background: var(--color-primary-dark);
}

.user-menu {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.menu-item {
  display: block;
  padding: var(--spacing-sm);
  color: var(--color-text);
  text-decoration: none;
  border-radius: var(--border-radius-sm);
  transition: background-color var(--transition-fast);
}

.menu-item:hover {
  background: var(--color-background-mute);
}

.search-input {
  width: 200px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.search-item {
  padding: var(--spacing-sm);
  background: var(--color-background-mute);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.search-item:hover {
  background: var(--color-border);
}

.placement-demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-sm);
}

/* Custom styling example */
.custom-popover :deep(.popover-panel) {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
}

.custom-popover :deep(.popover-panel__arrow) {
  background: var(--color-primary);
  border: none;
}

.custom-popover :deep(.popover-panel__header) {
  background: var(--color-primary-dark);
  border-bottom-color: var(--color-border-inverse, rgba(255, 255, 255, 0.2));
}

.custom-popover :deep(.popover-panel__title) {
  color: var(--color-text-inverse);
}
</style> 