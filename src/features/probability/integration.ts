import type { FeatureIntegration } from '@/features/types';
import { IconChartLine } from '@tabler/icons-vue';

export const probabilityFeature: FeatureIntegration = {
  id: 'probability',
  routes: [
    {
      path: '/probability-calculator',
      name: 'probability-calculator',
      component: () =>
        import('@/probability-calculator/ProbabilityCalculatorView.vue'),
      meta: { exact: true },
    },
  ],
  navigation: [
    {
      type: 'route',
      id: 'probability',
      labelKey: 'navigation.probabilityCalculator',
      path: '/probability-calculator',
      icon: IconChartLine,
      kind: 'tool',
      placement: 'primary',
      order: 40,
    },
  ],
  homeActions: [],
  globalComponents: [],
  linkKinds: [],
  dragKinds: [],
};

export const routes = probabilityFeature.routes;
export const navigation = probabilityFeature.navigation;
export const homeCard = probabilityFeature.homeCard;
export const homeActions = probabilityFeature.homeActions;
export const globalComponents = probabilityFeature.globalComponents;
export const linkKinds = probabilityFeature.linkKinds;
export const dragKinds = probabilityFeature.dragKinds;
