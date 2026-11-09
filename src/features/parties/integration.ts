import type { FeatureIntegration } from '@/features/types';
import { stripEntityMeta } from '@/features/create';
import { usePartyStore } from '@/stores/parties';
import { IconUsers } from '@tabler/icons-vue';

const partyStore = () => usePartyStore();

export const partiesFeature: FeatureIntegration = {
  id: 'parties',
  routes: [
    {
      path: '/parties',
      name: 'parties',
      component: () => import('@/parties/PartiesView.vue'),
      meta: { exact: true },
    },
    {
      path: '/parties/:id',
      name: 'party-detail',
      component: () => import('@/parties/PartyView.vue'),
    },
  ],
  navigation: [],
  homeCard: {
    id: 'parties',
    titleKey: 'home.stats.parties',
    route: '/parties',
    icon: IconUsers,
    order: 60,
    load: () => partyStore().load(),
    count: () => partyStore().items.length,
  },
  homeActions: [],
  globalComponents: [],
  linkKinds: [
    {
      kind: 'party',
      labelKey: 'parties.title',
      icon: IconUsers,
      titleField: 'name',
      route: (id) => `/parties/${id}`,
      editor: () => import('@/parties/PartyEditor.vue'),
      create: async (payload) => {
        const party = await usePartyStore().create(
          stripEntityMeta(payload as Record<string, unknown>) as any,
        );
        return { id: party.id, label: party.name };
      },
      useStore: usePartyStore,
    },
  ],
  dragKinds: ['party'],
};

export const routes = partiesFeature.routes;
export const navigation = partiesFeature.navigation;
export const homeCard = partiesFeature.homeCard;
export const homeActions = partiesFeature.homeActions;
export const globalComponents = partiesFeature.globalComponents;
export const linkKinds = partiesFeature.linkKinds;
export const dragKinds = partiesFeature.dragKinds;
