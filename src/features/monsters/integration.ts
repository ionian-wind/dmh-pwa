import type { FeatureIntegration } from '@/features/types';
import { stripEntityMeta } from '@/features/create';
import { useMonsterStore } from '@/stores/monsters';
import { IconGhost3 } from '@tabler/icons-vue';

const monsterStore = () => useMonsterStore();

export const monstersFeature: FeatureIntegration = {
  id: 'monsters',
  routes: [
    {
      path: '/monsters',
      name: 'monsters',
      component: () => import('@/monsters/MonstersView.vue'),
      meta: { exact: true },
    },
    {
      path: '/monsters/:id',
      name: 'monster-detail',
      component: () => import('@/monsters/MonsterView.vue'),
    },
  ],
  navigation: [
    {
      type: 'route',
      id: 'monsters',
      labelKey: 'navigation.monsters',
      path: '/monsters',
      icon: IconGhost3,
      kind: 'entity',
      placement: 'primary',
    },
  ],
  homeCard: {
    id: 'monsters',
    titleKey: 'home.stats.monsters',
    route: '/monsters',
    icon: '🐉',
    load: () => monsterStore().load(),
    count: () => monsterStore().items.length,
  },
  homeActions: [],
  globalComponents: [],
  linkKinds: [
    {
      kind: 'monster',
      labelKey: 'monsters.title',
      icon: IconGhost3,
      titleField: 'name',
      route: (id) => `/monsters/${id}`,
      editor: () => import('@/monsters/MonsterEditor.vue'),
      create: async (payload) => {
        const monster = await useMonsterStore().create(
          stripEntityMeta(payload as Record<string, unknown>) as any,
        );
        return { id: monster.id, label: monster.name };
      },
      useStore: useMonsterStore,
    },
  ],
  dragKinds: ['monster'],
};

export const routes = monstersFeature.routes;
export const navigation = monstersFeature.navigation;
export const homeCard = monstersFeature.homeCard;
export const homeActions = monstersFeature.homeActions;
export const globalComponents = monstersFeature.globalComponents;
export const linkKinds = monstersFeature.linkKinds;
export const dragKinds = monstersFeature.dragKinds;
