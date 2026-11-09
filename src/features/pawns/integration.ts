import type { FeatureIntegration } from '@/features/types';
import { stripEntityMeta } from '@/features/create';
import { usePawnStore } from '@/stores/pawns';
import { IconGhost3 } from '@tabler/icons-vue';

const pawnStore = () => usePawnStore();

export const pawnsFeature: FeatureIntegration = {
  id: 'pawns',
  routes: [
    {
      path: '/pawns',
      name: 'pawns',
      component: () => import('@/pawns/PawnsView.vue'),
      meta: { exact: true },
    },
    {
      path: '/pawns/:id',
      name: 'pawn-detail',
      component: () => import('@/pawns/PawnView.vue'),
    },
  ],
  navigation: [
    {
      type: 'route',
      id: 'pawns',
      labelKey: 'navigation.pawns',
      path: '/pawns',
      icon: IconGhost3,
      kind: 'entity',
      placement: 'primary',
      order: 30,
    },
  ],
  homeCard: {
    id: 'pawns',
    titleKey: 'home.stats.pawns',
    route: '/pawns',
    icon: IconGhost3,
    order: 20,
    load: () => pawnStore().load(),
    count: () => pawnStore().items.length,
  },
  homeActions: [],
  globalComponents: [],
  linkKinds: [
    {
      kind: 'pawn',
      labelKey: 'pawns.title',
      icon: IconGhost3,
      titleField: 'name',
      route: (id) => `/pawns/${id}`,
      editor: () => import('@/pawns/PawnEditor.vue'),
      create: async (payload) => {
        const pawn = await usePawnStore().create(
          stripEntityMeta(payload as Record<string, unknown>) as any,
        );
        return { id: pawn.id, label: pawn.name };
      },
      useStore: usePawnStore,
    },
  ],
  dragKinds: ['pawn'],
};

export const routes = pawnsFeature.routes;
export const navigation = pawnsFeature.navigation;
export const homeCard = pawnsFeature.homeCard;
export const homeActions = pawnsFeature.homeActions;
export const globalComponents = pawnsFeature.globalComponents;
export const linkKinds = pawnsFeature.linkKinds;
export const dragKinds = pawnsFeature.dragKinds;
