import type { FeatureIntegration } from '@/features/types';
import { useMapLocationStore } from '@/maps/locations';
import { IconMap } from '@tabler/icons-vue';

export const mapsFeature: FeatureIntegration = {
  id: 'maps',
  routes: [
    {
      path: '/locations',
      name: 'locations',
      component: () => import('@/maps/views/MapsView.vue'),
      meta: { exact: true },
    },
    {
      path: '/locations/:id',
      name: 'location-detail',
      component: () => import('@/maps/views/LocationView.vue'),
    },
  ],
  navigation: [
    {
      type: 'route',
      id: 'maps',
      labelKey: 'navigation.maps',
      path: '/locations',
      icon: IconMap,
      kind: 'entity',
      placement: 'scribe',
    },
  ],
  homeCard: {
    id: 'locations',
    titleKey: 'home.stats.locations',
    route: '/locations',
    icon: IconMap,
    order: 40,
    load: () => useMapLocationStore().load(),
    count: () => useMapLocationStore().items.length,
  },
  homeActions: [],
  globalComponents: [],
  linkKinds: [
    {
      kind: 'location',
      labelKey: 'maps.locations',
      icon: IconMap,
      titleField: 'name',
      route: (id) => `/locations/${id}`,
      editor: () => import('@/maps/components/MapLocationEditor.vue'),
      create: async (payload) => {
        const location = payload as any;
        const created = await useMapLocationStore().create({
          name: location.name,
          description: location.description,
          entities: location.entities ?? [],
          map: location.map ?? {
            fileId: '',
            layers: [],
            markers: [],
            areas: [],
          },
        });
        return { id: created.id, label: created.name };
      },
      useStore: useMapLocationStore,
    },
  ],
  dragKinds: ['location'],
};

export const routes = mapsFeature.routes;
export const navigation = mapsFeature.navigation;
export const homeCard = mapsFeature.homeCard;
export const homeActions = mapsFeature.homeActions;
export const globalComponents = mapsFeature.globalComponents;
export const linkKinds = mapsFeature.linkKinds;
export const dragKinds = mapsFeature.dragKinds;
