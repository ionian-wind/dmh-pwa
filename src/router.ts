import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import NotesView from '@/views/NotesView.vue';
import NoteView from '@/views/NoteView.vue';
import PartiesView from '@/views/PartiesView.vue';
import PartyView from '@/views/PartyView.vue';
import MonstersView from '@/views/MonstersView.vue';
import MonsterView from '@/views/MonsterView.vue';
import CharactersView from '@/views/CharactersView.vue';
import CharacterView from '@/views/CharacterView.vue';
import EncountersView from '@/views/EncountersView.vue';
import EncounterView from '@/views/EncounterView.vue';
import RunCombat from '@/components/RunCombat.vue';
import ModulesView from '@/views/ModulesView.vue';
import ModuleView from '@/views/ModuleView.vue';
import ConfigurationView from '@/views/ConfigurationView.vue';
import { useNavigationStore } from '@/stores/navigation';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { exact: true }
    },
    // Notes routes
    {
      path: '/notes',
      name: 'notes',
      component: NotesView,
      meta: { exact: true }
    },
    {
      path: '/notes/:id',
      name: 'note-detail',
      component: NoteView
    },
    // Parties routes
    {
      path: '/parties',
      name: 'parties',
      component: PartiesView,
      meta: { exact: true }
    },
    {
      path: '/parties/:id',
      name: 'party-detail',
      component: PartyView
    },
    // Monsters routes
    {
      path: '/monsters',
      name: 'monsters',
      component: MonstersView,
      meta: { exact: true }
    },
    {
      path: '/monsters/:id',
      name: 'monster-detail',
      component: MonsterView
    },
    // Characters routes
    {
      path: '/characters',
      name: 'characters',
      component: CharactersView,
      meta: { exact: true }
    },
    {
      path: '/characters/:id',
      name: 'character-detail',
      component: CharacterView
    },
    // Encounters routes
    {
      path: '/encounters',
      name: 'encounters',
      component: EncountersView,
      meta: { exact: true }
    },
    {
      path: '/encounters/:id',
      name: 'encounter-detail',
      component: EncounterView
    },
    {
      path: '/encounters/:id/combat',
      name: 'run-combat',
      component: RunCombat
    },
    // Modules routes
    {
      path: '/modules',
      name: 'modules',
      component: ModulesView,
      meta: { exact: true }
    },
    {
      path: '/modules/:id',
      name: 'module-detail',
      component: ModuleView
    },
    // Configuration route
    {
      path: '/configuration',
      name: 'configuration',
      component: ConfigurationView,
      meta: { exact: true }
    }
  ]
});

router.beforeEach((to, from, next) => {
  const navigationStore = useNavigationStore();
  
  // Don't update last opened page for detail views
  if (!to.params.id) {
    navigationStore.setLastOpenedPage(to.path);
  }
  
  next();
});

export default router;
