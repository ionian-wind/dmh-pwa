import { createRouter, createWebHistory } from 'vue-router';
const HomeView = () => import('@/views/HomeView.vue');
const NotesView = () => import('@/notes/NotesView.vue');
const NoteView = () => import('@/notes/NoteView.vue');
const PartiesView = () => import('@/parties/PartiesView.vue');
const PartyView = () => import('@/parties/PartyView.vue');
const MonstersView = () => import('@/monsters/MonstersView.vue');
const MonsterView = () => import('@/monsters/MonsterView.vue');
const CharactersView = () => import('@/characters/CharactersView.vue');
const CharacterView = () => import('@/characters/CharacterView.vue');
const EncountersView = () => import('@/encounters/EncountersView.vue');
const EncounterView = () => import('@/encounters/EncounterView.vue');
const CombatView = () => import('@/encounters/CombatView.vue');
const ModulesView = () => import('@/modules/ModulesView.vue');
const ModuleView = () => import('@/modules/ModuleView.vue');
const NotFoundView = () => import('@/views/NotFoundView.vue');
const JukeboxView = () => import('@/jukebox/JukeboxView.vue');
const TimersView = () => import('@/timers/TimersView.vue');
const AmbientSoundView = () => import('@/ambient-sound/AmbientSoundView.vue');
const MapsView = () => import('@/maps/views/MapsView.vue');
const LocationView = () => import('@/maps/views/LocationView.vue');
// import AllIconsView from './views/AllIconsView.vue';

const router = createRouter({
  history: createWebHistory('/dmh-pwa/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { exact: true },
    },
    // Notes routes
    {
      path: '/notes',
      name: 'notes',
      component: NotesView,
      meta: { exact: true },
    },
    {
      path: '/notes/:id',
      name: 'note-detail',
      component: NoteView,
    },
    // Parties routes
    {
      path: '/parties',
      name: 'parties',
      component: PartiesView,
      meta: { exact: true },
    },
    {
      path: '/parties/:id',
      name: 'party-detail',
      component: PartyView,
    },
    // Monsters routes
    {
      path: '/monsters',
      name: 'monsters',
      component: MonstersView,
      meta: { exact: true },
    },
    {
      path: '/monsters/:id',
      name: 'monster-detail',
      component: MonsterView,
    },
    // Characters routes
    {
      path: '/characters',
      name: 'characters',
      component: CharactersView,
      meta: { exact: true },
    },
    {
      path: '/characters/:id',
      name: 'character-detail',
      component: CharacterView,
    },
    // Encounters routes
    {
      path: '/encounters',
      name: 'encounters',
      component: EncountersView,
      meta: { exact: true },
    },
    {
      path: '/encounters/:id',
      name: 'encounter-detail',
      component: EncounterView,
    },
    // Combats routes
    {
      path: '/combats',
      name: 'combats',
      redirect: '/encounters',
    },
    {
      path: '/combats/:id',
      name: 'combat-detail',
      component: CombatView,
    },
    // Modules routes
    {
      path: '/modules',
      name: 'modules',
      component: ModulesView,
      meta: { exact: true },
    },
    {
      path: '/modules/:id',
      name: 'module-detail',
      component: ModuleView,
    },
    // Jukebox route
    {
      path: '/jukebox',
      name: 'jukebox',
      component: JukeboxView,
      meta: { exact: true },
    },
    // Timers route
    {
      path: '/timers',
      name: 'timers',
      component: TimersView,
      meta: { exact: true },
    },
    // Probability calculator
    {
      path: '/probability-calculator',
      name: 'probability-calculator',
      component: () =>
        import('@/probability-calculator/ProbabilityCalculatorView.vue'),
      meta: { exact: true },
    },
    {
      path: '/probability-calculator/syntax',
      name: 'probability-calculator-syntax',
      component: () =>
        import('@/probability-calculator/ProbabilitySyntaxView.vue'),
    },
    // Maps routes
    {
      path: '/maps',
      name: 'maps',
      component: MapsView,
      meta: { exact: true },
    },
    {
      path: '/maps/:id',
      redirect: (to) => `/locations/${to.params.id}`,
    },
    {
      path: '/locations/:id',
      name: 'location-detail',
      component: LocationView,
    },
    // Ambient Sound route
    {
      path: '/ambient',
      name: 'ambient-sound',
      component: AmbientSoundView,
      meta: { exact: true },
    },
    {
      path: '/ambient/:sceneId',
      redirect: { name: 'ambient-sound' },
    },
    // 404 route
    {
      path: '/:catchAll(.*)',
      component: NotFoundView,
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    // If navigating to a hash or using browser history, let anchorScroll handle it
    if (to.hash || savedPosition) {
      return false;
    }
    // On full navigation, scroll to top
    return { left: 0, top: 0 };
  },
});

export default router;
