import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { h } from 'vue';

import HomeView from '@/views/HomeView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import NotesView from '@/notes/NotesView.vue';
import CharactersView from '@/characters/CharactersView.vue';
import PartiesView from '@/parties/PartiesView.vue';
import PawnsView from '@/pawns/PawnsView.vue';
import EncountersView from '@/encounters/EncountersView.vue';
import TimersView from '@/timers/TimersView.vue';
import { createLayoutStore, LayoutKey } from '@/composables/useLayout';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => h('div') } },
      { path: '/notes', component: { render: () => h('div') } },
      { path: '/characters', component: { render: () => h('div') } },
      { path: '/parties', component: { render: () => h('div') } },
      { path: '/pawns', component: { render: () => h('div') } },
      { path: '/encounters', component: { render: () => h('div') } },
      { path: '/timers', component: { render: () => h('div') } },
    ],
  });
}

async function mountView(component: any, path = '/') {
  const router = makeRouter();
  await router.push(path);
  await router.isReady();
  const wrapper = mount(component, {
    global: {
      plugins: [router],
      provide: { [LayoutKey]: createLayoutStore() },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('current views', () => {
  it('renders HomeView with project branding', async () => {
    const wrapper = await mountView(HomeView, '/');
    expect(wrapper.text()).toContain("Owlbear's DMH");
    expect(wrapper.text()).toContain('Dungeon Master Helper');
    expect(wrapper.findAll('.stat-card').length).toBeGreaterThan(0);
  });

  it('renders NotFoundView', async () => {
    const wrapper = await mountView(NotFoundView, '/');
    expect(wrapper.text()).toContain('404');
  });

  it('navigates home and back from NotFoundView', async () => {
    const router = makeRouter();
    await router.push('/missing');
    await router.isReady();
    const push = vi.spyOn(router, 'push');
    const back = vi.spyOn(router, 'back').mockImplementation(() => {});

    const wrapper = mount(NotFoundView, {
      global: { plugins: [router] },
    });
    await flushPromises();

    const buttons = wrapper.findAll('button');
    await buttons[0].trigger('click');
    expect(push).toHaveBeenCalledWith('/');

    await buttons[1].trigger('click');
    expect(back).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it.each([
    ['notes', NotesView, '/notes'],
    ['characters', CharactersView, '/characters'],
    ['parties', PartiesView, '/parties'],
    ['pawns', PawnsView, '/pawns'],
    ['encounters', EncountersView, '/encounters'],
    ['timers', TimersView, '/timers'],
  ])('smoke renders the %s list view', async (_name, component, path) => {
    const wrapper = await mountView(component as any, path as string);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });
});
