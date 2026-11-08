import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import JukeboxNavItem from '@/features/jukebox/NavItem.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

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

  it('animates the icon while jukebox or ambient is playing', async () => {
    const player = useJukeboxPlayerStore();
    const ambient = useAmbientSoundStore();
    player.isPlaying = false;
    ambient.isPlaying = false;

    const wrapper = await mountAt('/jukebox');
    const icon = wrapper.find('.jukebox-button svg');
    expect(icon.classes()).not.toContain('jukebox-playing');

    ambient.isPlaying = true;
    await nextTick();
    expect(icon.classes()).toContain('jukebox-playing');

    ambient.isPlaying = false;
    player.isPlaying = true;
    await nextTick();
    expect(icon.classes()).toContain('jukebox-playing');

    player.isPlaying = false;
    ambient.isPlaying = false;
    await nextTick();
    expect(icon.classes()).not.toContain('jukebox-playing');
    wrapper.unmount();
  });
});
