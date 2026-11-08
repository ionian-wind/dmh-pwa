import type { FeatureIntegration } from '@/features/types';
import { stripEntityMeta } from '@/features/create';
import { useCharacterStore } from '@/stores/characters';
import { IconUser } from '@tabler/icons-vue';

const characterStore = () => useCharacterStore();

export const charactersFeature: FeatureIntegration = {
  id: 'characters',
  routes: [
    {
      path: '/characters',
      name: 'characters',
      component: () => import('@/characters/CharactersView.vue'),
      meta: { exact: true },
    },
    {
      path: '/characters/:id',
      name: 'character-detail',
      component: () => import('@/characters/CharacterView.vue'),
    },
  ],
  navigation: [
    {
      type: 'route',
      id: 'characters',
      labelKey: 'navigation.characters',
      path: '/characters',
      icon: IconUser,
      kind: 'entity',
      placement: 'primary',
      order: 10,
    },
  ],
  homeCard: {
    id: 'characters',
    titleKey: 'home.stats.characters',
    route: '/characters',
    icon: IconUser,
    order: 50,
    load: () => characterStore().load(),
    count: () => characterStore().items.length,
  },
  homeActions: [],
  globalComponents: [],
  linkKinds: [
    {
      kind: 'character',
      labelKey: 'characters.title',
      icon: IconUser,
      titleField: 'name',
      route: (id) => `/characters/${id}`,
      editor: () => import('@/characters/CharacterEditor.vue'),
      create: async (payload) => {
        const character = await useCharacterStore().create(
          stripEntityMeta(payload as Record<string, unknown>) as any,
        );
        return { id: character.id, label: character.name };
      },
      useStore: useCharacterStore,
    },
  ],
  dragKinds: ['character'],
};

export const routes = charactersFeature.routes;
export const navigation = charactersFeature.navigation;
export const homeCard = charactersFeature.homeCard;
export const homeActions = charactersFeature.homeActions;
export const globalComponents = charactersFeature.globalComponents;
export const linkKinds = charactersFeature.linkKinds;
export const dragKinds = charactersFeature.dragKinds;
