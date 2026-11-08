import type { FeatureIntegration } from '@/features/types';
import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';

export const ambientFeature: FeatureIntegration = {
  id: 'ambient',
  routes: [
    {
      path: '/ambient',
      name: 'ambient-sound',
      component: () => import('@/ambient-sound/AmbientSoundView.vue'),
      meta: { exact: true },
    },
    { path: '/ambient/:sceneId', redirect: { name: 'ambient-sound' } },
  ],
  navigation: [],
  homeActions: [],
  entityScenesPanel: EntityScenesPanel,
  globalComponents: [],
  linkKinds: [],
  dragKinds: [],
};

export const routes = ambientFeature.routes;
export const navigation = ambientFeature.navigation;
export const homeCard = ambientFeature.homeCard;
export const homeActions = ambientFeature.homeActions;
export const entityScenesPanel = ambientFeature.entityScenesPanel;
export const globalComponents = ambientFeature.globalComponents;
export const linkKinds = ambientFeature.linkKinds;
export const dragKinds = ambientFeature.dragKinds;
