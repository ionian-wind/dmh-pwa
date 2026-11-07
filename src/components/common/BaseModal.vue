<script setup lang="ts">
import {
  watch,
  onMounted,
  onUnmounted,
  computed,
  ref,
  useSlots,
  nextTick,
  type Component,
} from 'vue';
import { useModalState } from '@/composables/useModalState';
import { useI18n } from 'vue-i18n';
import {
  IconX,
  IconArrowsMinimize,
  IconArrowsMaximize,
} from '@tabler/icons-vue';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title?: string;
    showSubmit?: boolean;
    showCancel?: boolean;
    showDelete?: boolean;
    submitLabel?: string;
    cancelLabel?: string;
    deleteLabel?: string;
    showClose?: boolean;
    modalId: string;
    showExpand?: boolean;
    isExpanded?: boolean;
    disableSubmit?: boolean;
    useModalStack?: boolean;
    tabs?: Array<{
      name: string;
      title?: string;
      label?: string;
      icon?: Component;
    }>;
    activeTab?: string;
  }>(),
  {
    showClose: true,
    useModalStack: true,
  },
);

const emit = defineEmits<{
  (e: 'submit'): void;
  (e: 'cancel'): void;
  (e: 'delete'): void;
  (e: 'update:activeTab', value: string): void;
  (e: 'update:isOpen', value: boolean): void;
  (e: 'update:isExpanded', value: boolean): void;
}>();

const { openModal, closeModal, currentModalId } = useModalState();
const isExpanded = ref(props.isExpanded ?? false);
const slots = useSlots();
const hasHeader = computed(
  () =>
    !!props.title ||
    !!slots['header-actions'] ||
    !!slots['header-left-actions'] ||
    !!props.showExpand ||
    !!props.showClose ||
    !!props.tabs?.length,
);

const internalTab = ref(props.activeTab ?? props.tabs?.[0]?.name ?? '');

watch(
  () => props.activeTab,
  (value) => {
    if (value !== undefined) internalTab.value = value;
  },
);

watch(
  () => props.tabs,
  (tabs) => {
    if (!tabs?.length) return;
    if (!tabs.some((tab) => tab.name === internalTab.value)) {
      internalTab.value = tabs[0].name;
    }
  },
  { immediate: true, deep: true },
);

const currentTab = computed({
  get: () => internalTab.value,
  set: (value: string) => {
    internalTab.value = value;
    emit('update:activeTab', value);
  },
});

// Only show modal if it's open and is the top of the stack
const actuallyOpen = computed({
  get: () =>
    props.isOpen &&
    (props.useModalStack === false || currentModalId.value === props.modalId),
  set: (value: boolean) => {
    if (!value) requestClose();
  },
});

const { t } = useI18n();

function requestClose() {
  emit('update:isOpen', false);
  emit('cancel');
}

watch(
  () => props.isOpen,
  (open) => {
    if (props.useModalStack === false) return;
    nextTick(() => {
      if (open) {
        openModal(props.modalId);
      } else {
        closeModal(props.modalId);
      }
    });
  },
);

onMounted(() => {
  if (props.useModalStack !== false && props.isOpen) {
    nextTick(() => {
      openModal(props.modalId);
    });
  }
});

onUnmounted(() => {
  if (props.useModalStack !== false) closeModal(props.modalId);
});

// Sync prop to local state
watch(
  () => props.isExpanded,
  (val) => {
    if (typeof val === 'boolean') isExpanded.value = val;
  },
);

// Emit update when local state changes
function setExpanded(val: boolean) {
  isExpanded.value = val;
  emit('update:isExpanded', val);
}
</script>

<template>
  <Teleport to="body">
    <QDialog
      :maximized="isExpanded"
      v-model="actuallyOpen"
      persistent
      transition-show="fade"
      transition-hide="fade"
    >
      <QCard
        class="q-dialog-plugin q-mx-auto column no-wrap"
        :class="{ fit: isExpanded }"
        :style="
          !isExpanded
            ? 'min-width: 60vw; max-width: 90vw; height: 70vh; max-height: 90vh;'
            : undefined
        "
      >
        <QCardSection class="modal-header">
          <QToolbar v-if="hasHeader">
            <div class="col row items-center">
              <QBtn
                flat
                v-if="props.showExpand"
                class="modal-expand-btn"
                @click="setExpanded(!isExpanded)"
                variant="light"
                :title="isExpanded ? t('common.collapse') : t('common.expand')"
              >
                <IconArrowsMinimize v-if="isExpanded" />
                <IconArrowsMaximize v-else />
              </QBtn>

              <slot name="header-left-actions" />

              <span v-if="!props.tabs?.length">{{ title }}</span>
            </div>

            <QTabs
              v-if="props.tabs?.length"
              v-model="currentTab"
              dense
              align="center"
            >
              <QTab
                v-for="tab in props.tabs"
                :key="tab.name"
                :name="tab.name"
                :title="tab.title || tab.label || tab.name"
                :aria-label="tab.title || tab.label || tab.name"
              >
                <component :is="tab.icon" v-if="tab.icon" />
              </QTab>
            </QTabs>

            <div class="col row items-center justify-end">
              <slot name="header-actions" />

              <QBtn
                v-if="props.showClose !== false"
                flat
                variant="light"
                @click="requestClose"
                :aria-label="t('common.close')"
                class="btn-close-modal"
              >
                <IconX />
              </QBtn>
            </div>
          </QToolbar>
        </QCardSection>
        <QScrollArea class="fit q-pa-sm">
          <form
            @submit.prevent="$emit('submit')"
            class="modal-form q-gutter-y-md"
          >
            <template v-if="props.tabs?.length">
              <QTabPanels v-model="currentTab" animated class="q-pa-none">
                <QTabPanel
                  v-for="tab in props.tabs"
                  :key="tab.name"
                  :name="tab.name"
                  class="q-pa-none"
                >
                  <slot :name="tab.name" />
                </QTabPanel>
              </QTabPanels>
            </template>
            <template v-else>
              <slot v-if="$slots.default" />
              <slot v-else name="main" />
            </template>
          </form>
        </QScrollArea>
        <QCardActions
          v-if="$slots.footer || $slots.actions || showSubmit || showCancel"
          class="modal-actions"
          align="right"
        >
          <slot name="footer" />
          <slot name="actions" />
          <QBtn
            flat
            v-if="showDelete"
            color="negative"
            :label="deleteLabel || t('common.delete')"
            @click="$emit('delete')"
          />
          <QBtn flat v-if="showCancel" color="grey-7" @click="requestClose">
            {{ cancelLabel || t('common.cancel') }}
          </QBtn>
          <QBtn
            flat
            v-if="showSubmit"
            :color="'positive'"
            type="submit"
            :disabled="props.disableSubmit"
            @click.prevent="$emit('submit')"
          >
            {{ submitLabel || t('common.save') }}
          </QBtn>
        </QCardActions>
      </QCard>
    </QDialog>
  </Teleport>
</template>

<style scoped>
.modal-header {
  padding-bottom: 0;
}
</style>
