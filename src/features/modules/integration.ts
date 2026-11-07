import type { FeatureIntegration } from '@/features/types';
import { stripEntityMeta } from '@/features/create';
import { useModuleStore } from '@/stores/modules';
import ModulesHomeAction from './HomeAction.vue';
import { IconBook } from '@tabler/icons-vue';

const moduleStore = () => useModuleStore();

export const modulesFeature: FeatureIntegration = {
  id: 'modules',
  routes: [
    {
      path: '/modules',
      name: 'modules',
      component: () => import('@/modules/ModulesView.vue'),
      meta: { exact: true },
    },
    {
      path: '/modules/:id',
      name: 'module-detail',
      component: () => import('@/modules/ModuleView.vue'),
    },
  ],
  navigation: [
    {
      type: 'route',
      id: 'modules',
      labelKey: 'navigation.modules',
      path: '/modules',
      icon: IconBook,
      kind: 'entity',
      placement: 'primary',
    },
  ],
  homeCard: {
    id: 'modules',
    titleKey: 'home.stats.modules',
    route: '/modules',
    icon: '📖',
    load: () => moduleStore().load(),
    count: () => moduleStore().items.length,
  },
  homeActions: [ModulesHomeAction],
  globalComponents: [],
  linkKinds: [
    {
      kind: 'module',
      labelKey: 'modules.title',
      icon: IconBook,
      titleField: 'name',
      route: (id) => `/modules/${id}`,
      editor: () => import('@/modules/ModuleEditor.vue'),
      create: async (payload) => {
        const module = await useModuleStore().create(
          stripEntityMeta(payload as Record<string, unknown>) as any,
        );
        return { id: module.id, label: module.name };
      },
      useStore: useModuleStore,
    },
  ],
  dragKinds: ['module'],
};

export const routes = modulesFeature.routes;
export const navigation = modulesFeature.navigation;
export const homeCard = modulesFeature.homeCard;
export const homeActions = modulesFeature.homeActions;
export const globalComponents = modulesFeature.globalComponents;
export const linkKinds = modulesFeature.linkKinds;
export const dragKinds = modulesFeature.dragKinds;
