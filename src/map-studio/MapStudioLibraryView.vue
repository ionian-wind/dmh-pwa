<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import {
  createProjectWithMap,
  deleteProject,
} from '@/map-studio/persistence/repository';
import { confirm } from '@/dialogs';

const { t } = useI18n();
const router = useRouter();
const store = useMapStudioStore();

const projects = computed(() => store.projects);

onMounted(async () => {
  await store.loadLibrary();
});

async function createMap(): Promise<void> {
  const { project, map } = await createProjectWithMap(t('mapStudio.newMap'));
  await store.loadLibrary();
  await router.push(`/map-studio/${project.id}/${map.id}`);
}

async function openProject(id: string): Promise<void> {
  await router.push(`/map-studio/${id}`);
}

async function removeProject(id: string, name: string): Promise<void> {
  if (!(await confirm(t('common.confirmDelete', { title: name })))) return;
  await deleteProject(id);
  await store.loadLibrary();
}
</script>

<template>
  <div class="map-studio-library q-pa-lg">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h1 class="text-h4 q-my-none">{{ t('mapStudio.libraryTitle') }}</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ t('mapStudio.librarySubtitle') }}
        </p>
      </div>
      <QBtn
        color="primary"
        icon="tabler-plus"
        :label="t('mapStudio.newMap')"
        no-caps
        @click="createMap"
      />
    </div>

    <div v-if="projects.length === 0" class="empty-state q-pa-xl text-center">
      <QIcon name="tabler-map-2" size="56px" class="text-grey-5" />
      <h2 class="text-h6 q-mt-md">{{ t('mapStudio.emptyTitle') }}</h2>
      <p class="text-body2 text-grey-7">{{ t('mapStudio.emptyHint') }}</p>
      <QBtn
        color="primary"
        icon="tabler-plus"
        :label="t('mapStudio.newMap')"
        no-caps
        @click="createMap"
      />
    </div>

    <div v-else class="row q-col-gutter-md">
      <div
        v-for="project in projects"
        :key="project.id"
        class="col-12 col-sm-6 col-md-4 col-lg-3"
      >
        <QCard
          class="studio-project-card cursor-pointer"
          flat
          bordered
          @click="openProject(project.id)"
        >
          <div class="studio-project-preview">
            <QIcon name="tabler-map-2" size="40px" />
          </div>
          <QCardSection>
            <div class="text-subtitle1 text-weight-medium">
              {{ project.name }}
            </div>
            <div class="text-caption text-grey-7">
              {{ new Date(project.updatedAt).toLocaleString() }}
            </div>
          </QCardSection>
          <QCardActions align="right">
            <QBtn
              flat
              dense
              icon="tabler-trash"
              color="negative"
              :aria-label="t('common.delete')"
              @click.stop="removeProject(project.id, project.name)"
            />
          </QCardActions>
        </QCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-studio-library {
  min-height: 100%;
}
.studio-project-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 140px;
  color: var(--color-text-lighter);
  background:
    linear-gradient(135deg, rgba(120, 120, 120, 0.08), transparent),
    var(--color-background-mute);
}
.empty-state {
  max-width: 520px;
  margin: 10vh auto 0;
  border: 1px dashed var(--color-border-light);
  border-radius: 12px;
}
</style>
