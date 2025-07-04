<script setup lang="ts">
import { ref, watch } from 'vue';
import ViewHeader from './ViewHeader.vue';
import VueDraggable from 'vuedraggable';
import { IconChevronRight, IconChevronLeft } from '@tabler/icons-vue';
import { QList, QItem } from 'quasar';

const props = defineProps({
  items: { type: Array, required: true },
  cardComponent: { type: [Object, Function, String], required: true },
  editorComponent: { type: [Object, Function, String], required: false },
  emptyMessage: { type: String, required: true },
  createTitle: { type: String, required: true },
  showSearch: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'Search...' },
  cardProps: { type: Function, default: (item: any) => ({}) },
  editorProps: { type: Function, default: (item: any) => ({}) },
  sidePanelVisible: { type: Boolean, default: false },
  viewStyle: { type: String, default: 'masonry' },
  draggable: { type: Boolean, default: false },
  hideHeader: { type: Boolean, default: false },
});

const showEditor = ref(false);
const editingItem = ref<any>(null);
const isSidePanelVisible = ref(props.sidePanelVisible);
const localItems = ref([...props.items]);

watch(() => props.items, (val) => {
  localItems.value = [...val];
});

const emit = defineEmits(['create', 'edit', 'delete', 'submit', 'cancel', 'update:searchQuery', 'view', 'tag-click', 'copy', 'update:sidePanelVisible', 'sort']);

function handleSortEnd() {
  emit('sort', localItems.value);
}

function handleCreate() {
  editingItem.value = null;
  showEditor.value = true;
}
function handleEdit(item: any) {
  editingItem.value = item;
  showEditor.value = true;
}
function handleDelete(item: any) {}
function handleSubmit(item: any) {
  showEditor.value = false;
}
function handleCancel() {
  showEditor.value = false;
}
function handleSearch(val: string) {}
function toggleSidePanel() {
  isSidePanelVisible.value = !isSidePanelVisible.value;
  emit('update:sidePanelVisible', isSidePanelVisible.value);
}
function onCreate() {
  handleCreate();
  emit('create');
}

const cardPropsWithDraggable = (item: any) => {
  const base = props.cardProps(item);
  return { ...base, draggable: props.draggable };
};
</script>

<template>
  <div class="q-pa-md q-gutter-md base-list-container">
    <ViewHeader
      v-if="!hideHeader"
      show-create
      :create-title="createTitle"
      :show-search="showSearch"
      :search-query="searchQuery"
      :search-placeholder="searchPlaceholder"
      @create="onCreate"
      v-bind="$attrs"
    >
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </ViewHeader>
    <div class="row q-col-gutter-md base-list-layout">
      <div class="col main-list-column">
        <div class="view-list">
          <div v-if="items.length === 0" class="view-empty">
            <p>{{ emptyMessage }}</p>
          </div>
          <div v-else>
            <VueDraggable
              v-if="draggable"
              :key="'draggable'"
              v-model="localItems"
              item-key="id"
              @end="handleSortEnd"
              tag="ul"
              class="q-list simple-list"
            >
              <template #item="{ element: item }">
                <QItem>
                  <component :is="cardComponent" v-bind="cardPropsWithDraggable(item)" />
                </QItem>
              </template>
            </VueDraggable>
            <div v-else>
              <div v-if="viewStyle === 'masonry'" class="q-gutter-md row items-stretch">
                <div v-for="item in items as any[]" :key="item.id" class="col-12 col-sm-6 col-md-4 col-lg-3">
                  <component
                    :is="cardComponent"
                    v-bind="cardPropsWithDraggable(item)"
                    @view="$emit('view', item)"
                    @edit="() => { handleEdit(item); $emit('edit', item); }"
                    @delete="() => { handleDelete(item); $emit('delete', item); }"
                    @tag-click="$emit('tag-click', $event)"
                    @copy="$emit('copy', item)"
                  />
                </div>
              </div>
              <div v-else-if="viewStyle === 'grid'" class="q-gutter-md row items-stretch">
                <div v-for="item in items as any[]" :key="item.id" class="col-12 col-sm-6 col-md-4 col-lg-3">
                  <component
                    :is="cardComponent"
                    v-bind="cardPropsWithDraggable(item)"
                    @view="$emit('view', item)"
                    @edit="() => { handleEdit(item); $emit('edit', item); }"
                    @delete="() => { handleDelete(item); $emit('delete', item); }"
                    @tag-click="$emit('tag-click', $event)"
                    @copy="$emit('copy', item)"
                  />
                </div>
              </div>
              <QList v-else :key="'static'" class="simple-list">
                <QItem v-for="item in items as any[]" :key="item.id">
                  <component
                    :is="cardComponent"
                    v-bind="cardPropsWithDraggable(item)"
                    @view="$emit('view', item)"
                    @edit="() => { handleEdit(item); $emit('edit', item); }"
                    @delete="$emit('delete', item)"
                    @tag-click="$emit('tag-click', $event)"
                    @copy="$emit('copy', item)"
                  />
                </QItem>
              </QList>
            </div>
          </div>
          <component
            v-if="showEditor && editorComponent"
            :is="editorComponent"
            v-bind="editorProps(editingItem)"
            :is-open="showEditor"
            @submit="(item: any) => { handleSubmit(item); $emit('submit', item); }"
            @cancel="() => { handleCancel(); $emit('cancel'); }"
          />
        </div>
        <div v-if="$slots['fixed-bottom']" class="list-fixed-bottom">
          <slot name="fixed-bottom" />
        </div>
      </div>
      <!-- Side Panel -->
      <div v-if="$slots.sidepanel" class="sidebar-wrapper" :class="{ collapsed: !isSidePanelVisible }">
        <div class="side-panel-toggle-handle" @click="toggleSidePanel">
          <IconChevronRight v-if="isSidePanelVisible" />
          <IconChevronLeft v-else />
        </div>
        <div class="side-panel">
          <slot name="sidepanel" />
        </div>
      </div>
    </div>
    <slot />
  </div>
</template>

