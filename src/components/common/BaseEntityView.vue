<script setup lang="ts">
import { useRouter } from 'vue-router';
import {
  defineComponent,
  onBeforeUnmount,
  onMounted,
  useSlots,
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import NotFoundView from '@/views/NotFoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { ComponentInjection } from '@/types';

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
  unwrapContent?: boolean;
  headerShowEdit?: boolean;
  headerShowDelete?: boolean;
  headerButtons?: any[];
  rightDrawerIcon?: any;
  fill?: boolean;
}

const props = withDefaults(
  defineProps<Props & { sidePanelVisible?: boolean }>(),
  {
    unwrapContent: false,
    subtitle: '',
    loading: false,
    notFound: false,
    isEditing: false,
    hideHeader: false,
    headerShowEdit: true,
    headerShowDelete: true,
    headerButtons: () => [],
    fill: false,
  },
);

const router = useRouter();
const { t } = useI18n();

const handleEdit = () => {
  if (props.onEdit) {
    props.onEdit();
  }
};

const handleDelete = async () => {
  if (props.onDelete && (await props.onDelete())) {
    await router.push(props.listRoute);
  }
};

const layout = useLayout();
const rightDrawer = useRightDrawer();
const slots = useSlots();

const SidepanelHost = defineComponent({
  name: 'EntitySidepanel',
  setup() {
    return () => slots.sidepanel?.();
  },
});

const injectTopMenu = () => {
  const headerProps: Record<string, any> = {
    buttons: props.headerButtons,
    showEdit: props.headerShowEdit,
    onEdit: handleEdit,
    showDelete: props.headerShowDelete,
    onDelete: handleDelete,
    // The entity title now lives in the page content, not the app header.
    title: '',
    subtitle: '',
  };
  if (props.rightDrawerIcon)
    headerProps.rightDrawerIcon = props.rightDrawerIcon;
  layout.setTopMenuContent(
    props.hideHeader ? null : { component: ViewHeader, props: headerProps },
  );
};

onMounted(() => {
  injectTopMenu();
  if (slots.sidepanel) {
    rightDrawer.set({ component: SidepanelHost });
  }
});

// Add a watch to update the header when its visible actions change.
watch(
  () => [
    props.title,
    props.subtitle,
    props.hideHeader,
    props.headerShowEdit,
    props.headerShowDelete,
    props.headerButtons,
  ],
  () => injectTopMenu(),
  { deep: true },
);

onBeforeUnmount(() => {
  layout.setTopMenuContent(null);
  if (slots.sidepanel) {
    rightDrawer.clear();
  }
});
</script>

<template>
  <QLayout
    view="lHh Lpr lFf"
    :class="['base-entity-container', { 'base-entity-container--fill': fill }]"
  >
    <div v-if="loading" class="loading-state">{{ t('common.loading') }}</div>
    <NotFoundView v-else-if="notFound" />

    <template v-else-if="entity">
      <QPageContainer class="base-entity-layout">
        <QPage class="entity-main-column">
          <header
            v-if="props.title || props.subtitle"
            class="entity-page-header q-px-lg q-pt-md"
          >
            <h1
              v-if="props.title"
              class="entity-page-title text-h5 text-weight-medium q-ma-none"
            >
              {{ props.title }}
            </h1>
            <div
              v-if="props.subtitle"
              class="entity-page-subtitle text-subtitle1 text-grey-7 q-mt-xs"
            >
              {{ props.subtitle }}
            </div>
          </header>
          <div v-if="$slots.sub" class="entity-sub q-px-lg q-pt-md">
            <slot name="sub" />
          </div>
          <div v-if="$slots.actions" class="entity-actions q-px-lg q-pt-sm">
            <slot name="actions" />
          </div>
          <div class="base-entity-view q-px-lg">
            <slot v-if="props.unwrapContent" />
            <div v-else class="entity-content">
              <slot />
            </div>
            <slot name="editor" />
          </div>
        </QPage>
      </QPageContainer>
    </template>
  </QLayout>
</template>

<style scoped>
.base-entity-container--fill {
  height: calc(100dvh - 51px);
  min-height: 0 !important;
}

.base-entity-container--fill .base-entity-layout,
.base-entity-container--fill .entity-main-column {
  height: 100%;
}

.base-entity-container--fill .entity-main-column {
  display: flex;
  flex-direction: column;
  min-height: 0 !important;
}

.base-entity-container--fill .entity-page-header {
  flex: 0 0 auto;
}

.base-entity-container--fill .base-entity-view {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}
</style>
