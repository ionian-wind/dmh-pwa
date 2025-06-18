import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import { setActivePinia, createPinia } from 'pinia';
import HomeView from '@/views/HomeView.vue';

// Mock the stores
jest.mock('@/stores/notes', () => ({
  useNoteStore: () => ({
    filteredNotes: [
      { id: 'note-1', title: 'Note 1' },
      { id: 'note-2', title: 'Note 2' }
    ],
    loadNotes: jest.fn()
  })
}));

jest.mock('@/stores/modules', () => ({
  useModuleStore: () => ({
    modules: [
      { id: 'module-1', name: 'Module 1' },
      { id: 'module-2', name: 'Module 2' }
    ],
    loadModules: jest.fn()
  })
}));

jest.mock('@/stores/parties', () => ({
  usePartyStore: () => ({
    filteredParties: [
      { id: 'party-1', name: 'Party 1' },
      { id: 'party-2', name: 'Party 2' }
    ],
    loadParties: jest.fn()
  })
}));

jest.mock('@/stores/monsters', () => ({
  useMonsterStore: () => ({
    filteredMonsters: [
      { id: 'monster-1', name: 'Monster 1' },
      { id: 'monster-2', name: 'Monster 2' },
      { id: 'monster-3', name: 'Monster 3' }
    ],
    loadMonsters: jest.fn()
  })
}));

jest.mock('@/stores/encounters', () => ({
  useEncounterStore: () => ({
    filteredEncounters: [
      { id: 'encounter-1', name: 'Encounter 1' }
    ],
    loadEncounters: jest.fn()
  })
}));

jest.mock('@/stores/characters', () => ({
  useCharacterStore: () => ({
    all: [
      { id: 'char-1', name: 'Character 1' },
      { id: 'char-2', name: 'Character 2' },
      { id: 'char-3', name: 'Character 3' },
      { id: 'char-4', name: 'Character 4' }
    ]
  })
}));

// Create test router
const createTestRouter = () => {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/notes', component: { template: '<div>Notes</div>' } },
      { path: '/parties', component: { template: '<div>Parties</div>' } },
      { path: '/monsters', component: { template: '<div>Monsters</div>' } },
      { path: '/encounters', component: { template: '<div>Encounters</div>' } },
      { path: '/characters', component: { template: '<div>Characters</div>' } },
      { path: '/modules', component: { template: '<div>Modules</div>' } }
    ]
  });
};

// Create test i18n
const createTestI18n = () => {
  return createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        app: {
          title: 'D&D Session Notes Manager'
        },
        navigation: {
          home: 'Home'
        },
        common: {
          empty: 'No items found'
        },
        home: {
          stats: {
            notes: 'Notes',
            parties: 'Parties',
            monsters: 'Monsters',
            encounters: 'Encounters',
            characters: 'Characters',
            modules: 'Modules'
          }
        }
      }
    }
  });
};

describe('HomeView', () => {
  let router: ReturnType<typeof createTestRouter>;
  let i18n: ReturnType<typeof createTestI18n>;

  beforeEach(() => {
    setActivePinia(createPinia());
    router = createTestRouter();
    i18n = createTestI18n();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Structure', () => {
    it('should render the home view container', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      expect(wrapper.find('.home-view').exists()).toBe(true);
      expect(wrapper.find('.content').exists()).toBe(true);
    });

    it('should render the stats grid', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      expect(wrapper.find('.stats-grid').exists()).toBe(true);
    });

    it('should render all stat cards', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      const statCards = wrapper.findAll('.stat-card');
      expect(statCards).toHaveLength(6); // notes, parties, monsters, encounters, characters, modules
    });
  });

  describe('Stat Cards', () => {
    it('should render notes stat card with correct data', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      const notesCard = wrapper.findAll('.stat-card')[0];
      expect(notesCard.find('.stat-icon').text()).toBe('📜');
      expect(notesCard.find('h3').text()).toBe('Notes');
      expect(notesCard.find('p').text()).toBe('2 notes');
      expect(notesCard.attributes('href')).toBe('/notes');
    });

    it('should render parties stat card with correct data', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      const partiesCard = wrapper.findAll('.stat-card')[1];
      expect(partiesCard.find('.stat-icon').text()).toBe('👥');
      expect(partiesCard.find('h3').text()).toBe('Parties');
      expect(partiesCard.find('p').text()).toBe('2 parties');
      expect(partiesCard.attributes('href')).toBe('/parties');
    });

    it('should render monsters stat card with correct data', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      const monstersCard = wrapper.findAll('.stat-card')[2];
      expect(monstersCard.find('.stat-icon').text()).toBe('🐉');
      expect(monstersCard.find('h3').text()).toBe('Monsters');
      expect(monstersCard.find('p').text()).toBe('3 monsters');
      expect(monstersCard.attributes('href')).toBe('/monsters');
    });

    it('should render encounters stat card with correct data', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      const encountersCard = wrapper.findAll('.stat-card')[3];
      expect(encountersCard.find('.stat-icon').text()).toBe('⚔️');
      expect(encountersCard.find('h3').text()).toBe('Encounters');
      expect(encountersCard.find('p').text()).toBe('1 encounters');
      expect(encountersCard.attributes('href')).toBe('/encounters');
    });

    it('should render characters stat card with correct data', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      const charactersCard = wrapper.findAll('.stat-card')[4];
      expect(charactersCard.find('.stat-icon').text()).toBe('🧙🏻‍♂️');
      expect(charactersCard.find('h3').text()).toBe('Characters');
      expect(charactersCard.find('p').text()).toBe('4 characters');
      expect(charactersCard.attributes('href')).toBe('/characters');
    });

    it('should render modules stat card with correct data', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      const modulesCard = wrapper.findAll('.stat-card')[5];
      expect(modulesCard.find('.stat-icon').text()).toBe('📖');
      expect(modulesCard.find('h3').text()).toBe('Modules');
      expect(modulesCard.find('p').text()).toBe('2 modules');
      expect(modulesCard.attributes('href')).toBe('/modules');
    });
  });

  describe('i18n Integration', () => {
    it('should display current locale', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      expect(wrapper.text()).toContain('Current locale: en');
    });

    it('should display translated app title', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      expect(wrapper.text()).toContain('App title: D&D Session Notes Manager');
    });

    it('should display translated navigation text', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      expect(wrapper.text()).toContain('Navigation home: Home');
    });

    it('should display translated common text', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      expect(wrapper.text()).toContain('Common empty: No items found');
    });
  });

  describe('Data Loading', () => {
    it('should call load methods on mount', async () => {
      const { useNoteStore } = require('@/stores/notes');
      const { useModuleStore } = require('@/stores/modules');
      const { usePartyStore } = require('@/stores/parties');
      const { useMonsterStore } = require('@/stores/monsters');
      const { useEncounterStore } = require('@/stores/encounters');

      mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      // Wait for next tick to ensure onMounted has run
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(useNoteStore().loadNotes).toHaveBeenCalled();
      expect(useModuleStore().loadModules).toHaveBeenCalled();
      expect(usePartyStore().loadParties).toHaveBeenCalled();
      expect(useMonsterStore().loadMonsters).toHaveBeenCalled();
      expect(useEncounterStore().loadEncounters).toHaveBeenCalled();
    });
  });

  describe('Computed Stats', () => {
    it('should compute correct stats from stores', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      // The stats are computed from the mocked store data
      expect(wrapper.text()).toContain('2 notes');
      expect(wrapper.text()).toContain('2 parties');
      expect(wrapper.text()).toContain('3 monsters');
      expect(wrapper.text()).toContain('1 encounters');
      expect(wrapper.text()).toContain('4 characters');
      expect(wrapper.text()).toContain('2 modules');
    });
  });

  describe('Navigation', () => {
    it('should have correct router links', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      const links = wrapper.findAll('a');
      const hrefs = links.map(link => link.attributes('href'));
      
      expect(hrefs).toContain('/notes');
      expect(hrefs).toContain('/parties');
      expect(hrefs).toContain('/monsters');
      expect(hrefs).toContain('/encounters');
      expect(hrefs).toContain('/characters');
      expect(hrefs).toContain('/modules');
    });
  });

  describe('Styling Classes', () => {
    it('should have correct CSS classes', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      expect(wrapper.find('.home-view').classes()).toContain('home-view');
      expect(wrapper.find('.content').classes()).toContain('content');
      expect(wrapper.find('.stats-grid').classes()).toContain('stats-grid');
      
      const statCards = wrapper.findAll('.stat-card');
      statCards.forEach(card => {
        expect(card.classes()).toContain('stat-card');
      });
    });

    it('should have stat card structure', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      const firstCard = wrapper.findAll('.stat-card')[0];
      expect(firstCard.find('.stat-icon').exists()).toBe(true);
      expect(firstCard.find('.stat-content').exists()).toBe(true);
      expect(firstCard.find('.stat-content h3').exists()).toBe(true);
      expect(firstCard.find('.stat-content p').exists()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty store data', () => {
      // Mock empty stores
      jest.doMock('@/stores/notes', () => ({
        useNoteStore: () => ({
          filteredNotes: [],
          loadNotes: jest.fn()
        })
      }));

      jest.doMock('@/stores/parties', () => ({
        usePartyStore: () => ({
          filteredParties: [],
          loadParties: jest.fn()
        })
      }));

      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      expect(wrapper.text()).toContain('0 notes');
      expect(wrapper.text()).toContain('0 parties');
    });

    it('should handle missing store data gracefully', () => {
      const wrapper = mount(HomeView, {
        global: {
          plugins: [router, i18n]
        }
      });

      // Should not throw errors and should render the component
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.home-view').exists()).toBe(true);
    });
  });
}); 