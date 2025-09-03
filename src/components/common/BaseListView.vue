<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ViewHeader from './ViewHeader.vue';
import VueDraggable from 'vuedraggable';
import type { ComponentInjection } from '@/types';

const props = defineProps({
  items: { type: Array, required: true },
  cardComponent: { type: [Object, Function, String], required: true },
  editorComponent: { type: [Object, Function, String], required: false },
  emptyMessage: { type: String, required: true },
  createTitle: { type: String, required: true },
  cardProps: { type: Function, default: (item: any) => ({}) },
  editorProps: { type: Function, default: (item: any) => ({}) },
  sidePanelVisible: { type: Boolean, default: false },
  viewStyle: { type: String, default: 'masonry' },
  draggable: { type: Boolean, default: false },
  hideHeader: { type: Boolean, default: false },
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
]);

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

function onCreate() {
  handleCreate();
  emit('create');
}

const cardPropsWithDraggable = (item: any) => {
  const base = props.cardProps(item);
  return { ...base, draggable: props.draggable };
};

const setTopMenuContent = inject('setTopMenuContent') as (
  arg: ComponentInjection,
) => void;

onMounted(async () => {
  setTopMenuContent(
    props.hideHeader
      ? null
      : {
          component: ViewHeader,
          props: {
            showCreate: true,
            createTitle: props.createTitle,
            onCreate,
          },
        },
  );
});

onBeforeUnmount(() => {
  setTopMenuContent(null);
});
</script>

<template>
  <div class="q-pa-lg base-list-container">
    <div v-if="items.length === 0" class="fixed-center text-primary">
      {{ emptyMessage }}
    </div>
    <div v-else>
      <VueDraggable
        v-if="draggable"
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
          />
        </template>
      </VueDraggable>
      <div v-else>
        <div
          v-if="viewStyle === 'masonry'"
          class="q-gutter-md row items-stretch"
        >
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
          class="q-gutter-md row items-stretch"
        >
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
        <QList separator v-else :key="'static'" class="simple-list">
          <component
            v-for="item in items" :key="item.id"
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
