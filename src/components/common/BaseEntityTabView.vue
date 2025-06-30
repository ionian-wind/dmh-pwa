<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BaseEntityView from './BaseEntityView.vue';
import TabGroup, { type Tab } from './TabGroup.vue';
import TabPanel from './TabPanel.vue';

interface Props {
  entity: any | null;
  entityName: string;
  listRoute: string;
  onDelete?: () => Promise<void>;
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
  tabGroupProps?: Partial<InstanceType<typeof TabGroup>["$props"]>;
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  loading: false,
  notFound: false,
  isEditing: false,
  sidePanelVisible: true,
  hideHeader: false,
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

watch(() => props.modelValue, (val) => {
  if (val !== undefined && val !== activeTab.value) activeTab.value = val;
});

watch(() => props.tabs, (tabs) => {
  if (!tabs.find(tab => tab.id === activeTab.value)) {
    const firstEnabled = tabs.find(tab => !tab.disabled);
    if (firstEnabled) activeTab.value = firstEnabled.id;
  }
}, { immediate: true });

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
</script>

<template>
  <BaseEntityView
    v-bind="props"
    :unwrap-content="true"
    @update:sidePanelVisible="$emit('update:sidePanelVisible', $event)"
  >
    <template #default>
      <div>
        <TabGroup
          v-if="tabs.length > 0"
          v-model="activeTab"
          :tabs="tabs"
          v-bind="tabGroupProps"
          @update:modelValue="handleTabUpdate"
          @tab-click="handleTabClick"
          @tab-close="handleTabClose"
          @tab-add="handleTabAdd"
        >
          <TabPanel :tab-id="activeTab" class="entity-content">
            <slot :name="activeTab" />
          </TabPanel>
        </TabGroup>
      </div>
    </template>
    <template v-if="$slots.editor" #editor>
      <slot name="editor" />
    </template>
    <template v-if="$slots['fixed-bottom']" #fixed-bottom>
      <slot name="fixed-bottom" />
    </template>
    <template v-if="$slots.sidepanel" #sidepanel>
      <slot name="sidepanel" />
    </template>
    <template v-if="$slots.sub" #sub>
      <slot name="sub" />
    </template>
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
  </BaseEntityView>
</template> 