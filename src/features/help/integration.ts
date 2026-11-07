import type { FeatureIntegration } from '@/features/types';
import HelpNavItem from './NavItem.vue';

export const helpFeature: FeatureIntegration = {
  id: 'help',
  routes: [],
  navigation: [
    {
      type: 'component',
      id: 'help',
      component: HelpNavItem,
      kind: 'tool',
      placement: 'footer',
    },
  ],
  homeCard: undefined,
  homeActions: [],
  globalComponents: [],
  linkKinds: [],
  dragKinds: [],
};

export const routes = helpFeature.routes;
export const homeCard = helpFeature.homeCard;
export const navigation = helpFeature.navigation;
export const homeActions = helpFeature.homeActions;
export const globalComponents = helpFeature.globalComponents;
export const linkKinds = helpFeature.linkKinds;
export const dragKinds = helpFeature.dragKinds;
