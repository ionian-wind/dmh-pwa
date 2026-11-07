import type { FeatureIntegration } from '@/features/types';
import { stripEntityMeta } from '@/features/create';
import { useEncounterStore } from '@/stores/encounters';
import { IconSwords } from '@tabler/icons-vue';

const encounterStore = () => useEncounterStore();

export const encountersFeature: FeatureIntegration = {
  id: 'encounters',
  routes: [
    {
      path: '/encounters',
      name: 'encounters',
      component: () => import('@/encounters/EncountersView.vue'),
      meta: { exact: true },
    },
    {
      path: '/encounters/:id',
      name: 'encounter-detail',
      component: () => import('@/encounters/EncounterView.vue'),
    },
    { path: '/combats', name: 'combats', redirect: '/encounters' },
    {
      path: '/combats/:id',
      name: 'combat-detail',
      component: () => import('@/encounters/CombatView.vue'),
    },
  ],
  navigation: [
    {
      type: 'route',
      id: 'encounters',
      labelKey: 'navigation.encounters',
      path: '/encounters',
      icon: IconSwords,
      kind: 'entity',
      placement: 'primary',
    },
  ],
  homeCard: {
    id: 'encounters',
    titleKey: 'home.stats.encounters',
    route: '/encounters',
    icon: '⚔️',
    load: () => encounterStore().load(),
    count: () => encounterStore().items.length,
  },
  homeActions: [],
  globalComponents: [],
  linkKinds: [
    {
      kind: 'encounter',
      labelKey: 'encounters.title',
      icon: IconSwords,
      titleField: 'name',
      route: (id) => `/encounters/${id}`,
      editor: () => import('@/encounters/EncounterEditor.vue'),
      create: async (payload) => {
        const encounter = await useEncounterStore().create(
          stripEntityMeta(payload as Record<string, unknown>) as any,
        );
        return { id: encounter.id, label: encounter.name };
      },
      useStore: useEncounterStore,
    },
  ],
  dragKinds: ['encounter'],
};

export const routes = encountersFeature.routes;
export const navigation = encountersFeature.navigation;
export const homeCard = encountersFeature.homeCard;
export const homeActions = encountersFeature.homeActions;
export const globalComponents = encountersFeature.globalComponents;
export const linkKinds = encountersFeature.linkKinds;
export const dragKinds = encountersFeature.dragKinds;
