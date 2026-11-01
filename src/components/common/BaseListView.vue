<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { PropType } from 'vue';
import ViewHeader from './ViewHeader.vue';
import VueDraggable from 'vuedraggable';
import { useLayout } from '@/composables/useLayout';

const props = defineProps({
  items: { type: Array as PropType<any[]>, required: true },
  cardComponent: { type: [Object, Function, String], required: true },
  editorComponent: { type: [Object, Function, String], required: false },
  emptyMessage: { type: String, required: true },
  createTitle: { type: String, required: true },
  cardProps: {
    type: Function as PropType<(item: any) => any>,
    default: (item: any) => ({}),
  },
  editorProps: {
    type: Function as PropType<(item: any) => any>,
    default: (item: any) => ({}),
  },
  sidePanelVisible: { type: Boolean, default: false },
  viewStyle: { type: String, default: 'masonry' },
  draggable: { type: Boolean, default: false },
  hideHeader: { type: Boolean, default: false },
  rightDrawerIcon: { type: [Object, Function], default: undefined },
  showSearch: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'common.search' },
});

const showEditor = ref(false);
const editingItem = ref<any>(null);
const localItems = ref([...props.items]);

watch(
  () => props.items,
  (val) => {
    localItems.value = [...val];
  },
);

const emit = defineEmits([
  'create',
  'edit',
  'delete',
  'submit',
  'cancel',
  'update:searchQuery',
  'view',
  'tag-click',
  'copy',
  'update:sidePanelVisible',
  'sort',
  'drop',
  'dragover',
  'dragleave',
]);

function handleSortEnd() {
  emit('sort', localItems.value);
}

function handleDrop(event: DragEvent) {
  emit('drop', event);
}

function handleDragOver(event: DragEvent) {
  emit('dragover', event);
}

function handleDragLeave(event: DragEvent) {
  emit('dragleave', event);
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

function onCreate() {
  handleCreate();
  emit('create');
}

const cardPropsWithDraggable = (item: any) => {
  const base = props.cardProps(item);
  return { ...base, draggable: props.draggable };
};

const layout = useLayout();

let headerProps: Record<string, any> | null = null;

function syncHeaderProps() {
  if (!headerProps) return;
  Object.assign(headerProps, {
    showCreate: true,
    createTitle: props.createTitle,
    onCreate,
    showSearch: props.showSearch,
    searchQuery: props.searchQuery,
    searchPlaceholder: props.searchPlaceholder,
    'onUpdate:searchQuery': (value: string) =>
      emit('update:searchQuery', value),
  });
}

onMounted(async () => {
  headerProps = reactive<Record<string, any>>({
    showCreate: true,
    createTitle: props.createTitle,
    onCreate,
    showSearch: props.showSearch,
    searchQuery: props.searchQuery,
    searchPlaceholder: props.searchPlaceholder,
    'onUpdate:searchQuery': (value: string) =>
      emit('update:searchQuery', value),
  });
  if (props.rightDrawerIcon) {
    headerProps.rightDrawerIcon = props.rightDrawerIcon;
  }
  layout.setTopMenuContent(
    props.hideHeader ? null : { component: ViewHeader, props: headerProps },
  );
});

watch(
  () => [
    props.createTitle,
    props.showSearch,
    props.searchQuery,
    props.searchPlaceholder,
  ],
  syncHeaderProps,
);

onBeforeUnmount(() => {
  layout.setTopMenuContent(null);
  headerProps = null;
});
</script>

<template>
  <div
    class="q-pa-lg base-list-container"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
  >
    <div v-if="items.length === 0" class="empty-state q-pa-xl text-center text-primary">
      {{ emptyMessage }}
    </div>

    <VueDraggable
      v-else-if="draggable"
      :key="'draggable'"
      v-model="localItems"
      item-key="id"
      @end="handleSortEnd"
      tag="div"
      class="q-list simple-list"
    >
      <template #item="{ element: item }">
        <component
          :is="cardComponent"
          v-bind="cardPropsWithDraggable(item)"
          @view="$emit('view', item)"
          @edit="
            () => {
              handleEdit(item);
              $emit('edit', item);
            }
          "
          @delete="$emit('delete', item)"
          @tag-click="$emit('tag-click', $event)"
          @copy="$emit('copy', item)"
        />
      </template>
    </VueDraggable>
    <div v-else>
      <div v-if="viewStyle === 'masonry'" class="q-col-gutter-md row items-stretch">
        <div
          v-for="item in items"
          :key="item.id"
          class="col-12 col-sm-6 col-md-4 col-lg-3"
        >
          <component
            :is="cardComponent"
            v-bind="cardPropsWithDraggable(item)"
            @view="$emit('view', item)"
            @edit="
              () => {
                handleEdit(item);
                $emit('edit', item);
              }
            "
            @delete="$emit('delete', item)"
            @tag-click="$emit('tag-click', $event)"
            @copy="$emit('copy', item)"
          />
        </div>
      </div>
      <div
        v-else-if="viewStyle === 'grid'"
        class="q-col-gutter-md row items-stretch"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="col-12 col-sm-6 col-md-4 col-lg-4"
        >
          <component
            :is="cardComponent"
            v-bind="cardPropsWithDraggable(item)"
            @view="$emit('view', item)"
            @edit="
              () => {
                handleEdit(item);
                $emit('edit', item);
              }
            "
            @delete="$emit('delete', item)"
            @tag-click="$emit('tag-click', $event)"
            @copy="$emit('copy', item)"
          />
        </div>
      </div>
      <QList separator v-else :key="'static'" class="simple-list">
        <component
          v-for="item in items"
          :key="item.id"
          :is="cardComponent"
          v-bind="cardPropsWithDraggable(item)"
          @view="$emit('view', item)"
          @edit="
            () => {
              handleEdit(item);
              $emit('edit', item);
            }
          "
          @delete="$emit('delete', item)"
          @tag-click="$emit('tag-click', $event)"
          @copy="$emit('copy', item)"
        />
      </QList>
    </div>

    <component
      v-if="showEditor && editorComponent"
      :is="editorComponent"
      v-bind="editorProps(editingItem)"
      :is-open="showEditor"
      @submit="
        (item: any) => {
          handleSubmit(item);
          $emit('submit', item);
        }
      "
      @cancel="
        () => {
          handleCancel();
          $emit('cancel');
        }
      "
    />

    <slot />
  </div>
</template>
