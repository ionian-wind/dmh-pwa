import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import JukeboxNavItem from '@/features/jukebox/NavItem.vue';

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      { path: '/jukebox', component: { render: () => null } },
      { path: '/ambient', component: { render: () => null } },
      {
        path: '/ambient/:sceneId',
        component: { render: () => null },
      },
    ],
  });
}

async function mountAt(path: string) {
  const router = makeRouter();
  await router.push(path);
  await router.isReady();
  return mount(JukeboxNavItem, { global: { plugins: [router] } });
}

describe('jukebox navigation item', () => {
  it.each(['/jukebox', '/ambient', '/ambient/tavern'])(
    'marks active on %s',
    async (path) => {
      const wrapper = await mountAt(path);
      expect(wrapper.find('.jukebox-button').attributes('active')).toBe('true');
      wrapper.unmount();
    },
  );

  it('does not mark active on unrelated pages', async () => {
    const wrapper = await mountAt('/');
    expect(wrapper.find('.jukebox-button').attributes('active')).not.toBe(
      'true',
    );
    wrapper.unmount();
  });
});
