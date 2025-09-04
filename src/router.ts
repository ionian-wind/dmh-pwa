import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import NotesView from '@/notes/NotesView.vue';
import NoteView from '@/notes/NoteView.vue';
import PartiesView from '@/parties/PartiesView.vue';
import PartyView from '@/parties/PartyView.vue';
import MonstersView from '@/monsters/MonstersView.vue';
import MonsterView from '@/monsters/MonsterView.vue';
import CharactersView from '@/characters/CharactersView.vue';
import CharacterView from '@/characters/CharacterView.vue';
import EncountersView from '@/encounters/EncountersView.vue';
import EncounterView from '@/encounters/EncounterView.vue';
import CombatView from '@/encounters/CombatView.vue';
import ModulesView from '@/modules/ModulesView.vue';
import ModuleView from '@/modules/ModuleView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import JukeboxView from '@/jukebox/JukeboxView.vue';
import TimersView from '@/timers/TimersView.vue';
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
