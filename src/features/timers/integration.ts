import type { FeatureIntegration } from '@/features/types';
import TimersNavItem from './NavItem.vue';
import TimersGlobal from './Global.vue';

export const timersFeature: FeatureIntegration = {
  id: 'timers',
  routes: [],
  navigation: [
    {
      type: 'component',
      id: 'timers',
      component: TimersNavItem,
      kind: 'tool',
      placement: 'primary',
      order: 60,
    },
  ],
  homeActions: [],
  globalComponents: [TimersGlobal],
  linkKinds: [],
  dragKinds: [],
};

export const routes = timersFeature.routes;
export const navigation = timersFeature.navigation;
export const homeCard = timersFeature.homeCard;
export const homeActions = timersFeature.homeActions;
export const globalComponents = timersFeature.globalComponents;
export const linkKinds = timersFeature.linkKinds;
export const dragKinds = timersFeature.dragKinds;
