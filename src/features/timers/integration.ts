import type { FeatureIntegration } from '@/features/types';
import TimersNavItem from './NavItem.vue';

export const timersFeature: FeatureIntegration = {
  id: 'timers',
  routes: [
    {
      path: '/timers',
      name: 'timers',
      component: () => import('@/timers/TimersView.vue'),
      meta: { exact: true },
    },
  ],
  navigation: [
    {
      type: 'component',
      id: 'timers',
      component: TimersNavItem,
      kind: 'tool',
      placement: 'primary',
      order: 60,
      activePathPrefixes: ['/timers'],
    },
  ],
  homeActions: [],
  globalComponents: [],
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
