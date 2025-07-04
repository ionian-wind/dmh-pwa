<script setup lang="ts">
import { useRouter } from 'vue-router';
import { inject, onBeforeUnmount, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import NotFoundView from '@/views/NotFoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
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
            showEdit: true,
            onEdit: handleEdit,
            showDelete: true,
            onDelete: handleDelete,
            title: props.title || '',
            subtitle: props.subtitle || '',
          },
        },
  );
});

// Add a watch to update the header when title, subtitle, or hideHeader change
watch(
  () => [props.title, props.subtitle, props.hideHeader],
  () => {
    setTopMenuContent(
      props.hideHeader
        ? null
        : {
            component: ViewHeader,
            props: {
              showEdit: true,
              onEdit: handleEdit,
              showDelete: true,
              onDelete: handleDelete,
              title: props.title || '',
              subtitle: props.subtitle || '',
            },
          },
    );
  },
);

onBeforeUnmount(() => {
  setTopMenuContent(null);
});
</script>

<template>
  <QLayout view="lHh Lpr lFf" class="base-entity-container">
    <div v-if="loading" class="loading-state">{{ t('common.loading') }}</div>
    <NotFoundView v-else-if="notFound" />

    <template v-else-if="entity">
      <QPageContainer class="base-entity-layout">
        <QPage class="entity-main-column">
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
