import type { FeatureIntegration } from '@/features/types';
import { IconMap2 } from '@tabler/icons-vue';

export const mapStudioFeature: FeatureIntegration = {
  id: 'mapStudio',
  routes: [
    {
      path: '/map-studio',
      name: 'map-studio-library',
      component: () => import('@/map-studio/MapStudioLibraryView.vue'),
      meta: { exact: true },
    },
    {
      path: '/map-studio/:projectId/:mapId?',
      name: 'map-studio',
      component: () => import('@/map-studio/MapStudioView.vue'),
    },
  ],
  navigation: [
    {
      type: 'route',
      id: 'mapStudio',
      labelKey: 'navigation.mapStudio',
      path: '/map-studio',
      icon: IconMap2,
      kind: 'tool',
      placement: 'primary',
      order: 55,
      activePathPrefixes: ['/map-studio'],
    },
  ],
  homeActions: [],
  globalComponents: [],
  linkKinds: [],
  dragKinds: [],
};

export const routes = mapStudioFeature.routes;
export const navigation = mapStudioFeature.navigation;
export const homeCard = mapStudioFeature.homeCard;
export const homeActions = mapStudioFeature.homeActions;
export const globalComponents = mapStudioFeature.globalComponents;
export const linkKinds = mapStudioFeature.linkKinds;
export const dragKinds = mapStudioFeature.dragKinds;
