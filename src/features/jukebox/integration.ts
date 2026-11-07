import type { FeatureIntegration } from '@/features/types';
import { IconPlaylist } from '@tabler/icons-vue';
import { useJukeboxPlaylistsStore } from '@/jukebox/stores';
import JukeboxNavItem from './NavItem.vue';
import JukeboxGlobal from './Global.vue';

export const jukeboxFeature: FeatureIntegration = {
  id: 'jukebox',
  routes: [
    {
      path: '/jukebox',
      name: 'jukebox',
      component: () => import('@/jukebox/JukeboxView.vue'),
      meta: { exact: true },
    },
  ],
  navigation: [
    {
      type: 'component',
      id: 'jukebox',
      component: JukeboxNavItem,
      kind: 'tool',
      placement: 'footer',
      activePathPrefixes: ['/jukebox'],
    },
  ],
  homeActions: [],
  globalComponents: [JukeboxGlobal],
  linkKinds: [
    {
      kind: 'playlist',
      labelKey: 'playlist.title',
      icon: IconPlaylist,
      titleField: 'name',
      route: (id) => `/jukebox`,
      editor: () => import('@/jukebox/components/PlaylistEditor.vue'),
      create: async (payload) => {
        const playlist = payload as any;
        if (!playlist?.id) return null;
        return { id: playlist.id, label: playlist.name };
      },
      useStore: useJukeboxPlaylistsStore,
    },
  ],
  dragKinds: [],
};

export const routes = jukeboxFeature.routes;
export const navigation = jukeboxFeature.navigation;
export const homeCard = jukeboxFeature.homeCard;
export const homeActions = jukeboxFeature.homeActions;
export const globalComponents = jukeboxFeature.globalComponents;
export const linkKinds = jukeboxFeature.linkKinds;
export const dragKinds = jukeboxFeature.dragKinds;
