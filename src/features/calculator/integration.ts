import type { FeatureIntegration } from '@/features/types';
import CalculatorNavItem from './NavItem.vue';
import CalculatorGlobal from './Global.vue';

export const calculatorFeature: FeatureIntegration = {
  id: 'calculator',
  routes: [],
  navigation: [
    {
      type: 'component',
      id: 'calculator',
      component: CalculatorNavItem,
      kind: 'tool',
      placement: 'primary',
      order: 70,
    },
  ],
  homeActions: [],
  globalComponents: [CalculatorGlobal],
  linkKinds: [],
  dragKinds: [],
};

export const routes = calculatorFeature.routes;
export const navigation = calculatorFeature.navigation;
export const homeCard = calculatorFeature.homeCard;
export const homeActions = calculatorFeature.homeActions;
export const globalComponents = calculatorFeature.globalComponents;
export const linkKinds = calculatorFeature.linkKinds;
export const dragKinds = calculatorFeature.dragKinds;
