import { createRouter, createWebHistory } from 'vue-router';
import { featureRoutes } from 'virtual:feature-routes';
import HomeView from '@/views/HomeView.vue';
import NotFoundView from '@/views/NotFoundView.vue';

const router = createRouter({
  history: createWebHistory('/dmh-pwa/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { exact: true },
    },
    ...featureRoutes,
    {
      path: '/:catchAll(.*)',
      component: NotFoundView,
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    // If navigating to a hash or using browser history, let anchorScroll handle it.
    if (to.hash || savedPosition) {
      return false;
    }
    // On full navigation, scroll to top.
    return { left: 0, top: 0 };
  },
});

export default router;
