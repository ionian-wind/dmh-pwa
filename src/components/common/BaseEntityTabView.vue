<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseEntityView from './BaseEntityView.vue';

interface Tab {
  id: string;
  label: string;
  icon?: any;
  disabled?: boolean;
  badge?: string | number;
}

interface Props {
  entity: any | null;
  entityName: string;
  listRoute: string;
  onDelete?: () => Promise<boolean>;
  onEdit?: () => void;
  isEditing?: boolean;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  notFound?: boolean;
  hideHeader?: boolean;
  sidePanelVisible?: boolean;
  tabs: Tab[];
  modelValue?: string;
  headerButtons?: any[];
  leftHeaderButtons?: any[];
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  loading: false,
  notFound: false,
  isEditing: false,
  sidePanelVisible: true,
  hideHeader: false,
  headerButtons: () => [],
  leftHeaderButtons: () => [],
  tabs: () => [],
});

const emit = defineEmits([
  'update:sidePanelVisible',
  'update:modelValue',
  'tab-click',
  'tab-close',
  'tab-add',
]);

const activeTab = ref(props.modelValue || props.tabs[0]?.id || '');

watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined && val !== activeTab.value) activeTab.value = val;
  },
);

watch(
  () => props.tabs,
  (tabs) => {
    if (!tabs.find((tab) => tab.id === activeTab.value)) {
      const firstEnabled = tabs.find((tab) => !tab.disabled);
      if (firstEnabled) activeTab.value = firstEnabled.id;
    }
  },
  { immediate: true },
);

function handleTabUpdate(val: string) {
  activeTab.value = val;
  emit('update:modelValue', val);
}

function handleTabClick(tab: Tab) {
  emit('tab-click', tab);
}
function handleTabClose(tabId: string) {
  emit('tab-close', tabId);
}
function handleTabAdd() {
  emit('tab-add');
}

const viewProps = computed(() => {
  const { modelValue: _modelValue, ...rest } = props;
  return { ...rest, modelValue: activeTab.value };
});
</script>

<template>
  <BaseEntityView
    v-bind="viewProps"
    :unwrap-content="true"
    @update:model-value="handleTabUpdate"
    @tab-click="handleTabClick"
    @update:sidePanelVisible="$emit('update:sidePanelVisible', $event)"
  >
    <template #default>
      <QTabPanels v-model="activeTab" animated>
        <QTabPanel v-for="tab in tabs" :key="tab.id" :name="tab.id">
          <slot :name="tab.id" />
        </QTabPanel>
      </QTabPanels>
    </template>
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
    <template v-if="$slots.sub" #sub>
      <slot name="sub" />
    </template>
    <template v-if="$slots.sidepanel" #sidepanel>
      <slot name="sidepanel" />
    </template>
    <template v-if="$slots.editor" #editor>
      <slot name="editor" />
    </template>
  </BaseEntityView>
</template>
