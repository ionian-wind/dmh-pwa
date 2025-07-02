import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { setActivePinia, createPinia } from 'pinia';
import HomeView from '@/views/HomeView.vue';
import { vi } from 'vitest';

// Mock the stores
vi.mock('@/stores/notes', () => ({ useNoteStore: () => ({ 
  filtered: [
    { id: 'n1', title: 'Note One', content: 'Content', tags: [], moduleId: null, typeId: null, createdAt: 0, updatedAt: 0 },
    { id: 'n2', title: 'Note Two', content: 'Content', tags: [], moduleId: null, typeId: null, createdAt: 0, updatedAt: 0 }
  ], 
  load: vi.fn() 
}) }));

vi.mock('@/stores/modules', () => ({ useModuleStore: () => ({ 
  items: [
    { id: 'm1', name: 'Module One', description: 'Desc', createdAt: 0, updatedAt: 0 },
    { id: 'm2', name: 'Module Two', description: 'Desc', createdAt: 0, updatedAt: 0 }
  ], 
  load: vi.fn() 
}) }));

vi.mock('@/stores/parties', () => ({ usePartyStore: () => ({ 
  filtered: [
    { id: 'p1', name: 'Party One', characters: [], moduleIds: [], createdAt: 0, updatedAt: 0 },
    { id: 'p2', name: 'Party Two', characters: [], moduleIds: [], createdAt: 0, updatedAt: 0 }
  ], 
  load: vi.fn() 
}) }));

vi.mock('@/stores/monsters', () => ({ useMonsterStore: () => ({ 
  filtered: [
    { id: 'mo1', name: 'Goblin', type: 'humanoid', size: 'small', alignment: 'neutral evil', armorClass: 15, hitPoints: 7, speed: { walk: 30 }, stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, senses: [], languages: ['Common', 'Goblin'], challengeRating: 0.25, xp: 50, actions: [], moduleIds: [], createdAt: 0, updatedAt: 0 },
    { id: 'mo2', name: 'Orc', type: 'humanoid', size: 'medium', alignment: 'chaotic evil', armorClass: 13, hitPoints: 15, speed: { walk: 30 }, stats: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 }, senses: [], languages: ['Common', 'Orc'], challengeRating: 0.5, xp: 100, actions: [], moduleIds: [], createdAt: 0, updatedAt: 0 }
  ], 
  load: vi.fn() 
}) }));

vi.mock('@/stores/encounters', () => ({ useEncounterStore: () => ({ 
  filtered: [
    { id: 'e1', name: 'Encounter One', difficulty: 'Easy', monsters: {}, currentRound: 0, currentTurn: 0, moduleId: 'm1', createdAt: 0, updatedAt: 0 },
    { id: 'e2', name: 'Encounter Two', difficulty: 'Medium', monsters: {}, currentRound: 0, currentTurn: 0, moduleId: 'm2', createdAt: 0, updatedAt: 0 }
  ], 
  load: vi.fn() 
}) }));

vi.mock('@/stores/characters', () => ({
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

describe('HomeView', () => {
  let router: ReturnType<typeof createTestRouter>;

  beforeEach(() => {
    setActivePinia(createPinia());
    router = createTestRouter();
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      expect(monstersCard.find('p').text()).toBe('2 monsters');
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
      expect(encountersCard.find('p').text()).toBe('2 encounters');
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

      expect(wrapper.text()).toContain('App title: Owlbear\'s Dungeon Master Helper');
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

      expect(useNoteStore().load).toHaveBeenCalled();
      expect(useModuleStore().load).toHaveBeenCalled();
      expect(usePartyStore().load).toHaveBeenCalled();
      expect(useMonsterStore().load).toHaveBeenCalled();
      expect(useEncounterStore().load).toHaveBeenCalled();
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
      expect(wrapper.text()).toContain('2 monsters');
      expect(wrapper.text()).toContain('2 encounters');
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
      vi.doMock('@/stores/notes', () => ({
        useNoteStore: () => ({
          filtered: [],
          load: vi.fn()
        })
      }));

      vi.doMock('@/stores/parties', () => ({
        usePartyStore: () => ({
          filtered: [],
          load: vi.fn()
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
