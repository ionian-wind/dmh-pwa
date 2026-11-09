import type { FeatureIntegration } from '@/features/types';
import DiceRollerNavItem from './NavItem.vue';

export const diceRollerFeature: FeatureIntegration = {
  id: 'diceRoller',
  routes: [],
  navigation: [
    {
      type: 'component',
      id: 'diceRoller',
      component: DiceRollerNavItem,
      kind: 'tool',
      placement: 'footer',
      order: -100,
    },
  ],
  homeActions: [],
  globalComponents: [],
  linkKinds: [],
  dragKinds: [],
};

export const routes = diceRollerFeature.routes;
export const navigation = diceRollerFeature.navigation;
export const homeCard = diceRollerFeature.homeCard;
export const homeActions = diceRollerFeature.homeActions;
export const globalComponents = diceRollerFeature.globalComponents;
export const linkKinds = diceRollerFeature.linkKinds;
export const dragKinds = diceRollerFeature.dragKinds;
