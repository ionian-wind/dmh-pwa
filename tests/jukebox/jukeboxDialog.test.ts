import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import JukeboxDialog from '@/jukebox/components/JukeboxDialog.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useConfigStore } from '@/utils/configStore';
import { quasarStubs } from '../helpers/quasar-stubs';

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      { path: '/jukebox', component: { render: () => null } },
    ],
  });
}

async function mountDialog() {
  const router = makeRouter();
  await router.push('/');
  await router.isReady();
  const wrapper = mount(JukeboxDialog, {
    props: { modelValue: true },
    global: {
      plugins: [router],
      stubs: { JukeboxPlayer: true },
    },
  });
  return { wrapper, router };
}

describe('JukeboxDialog', () => {
  beforeEach(() => {
    const player = useJukeboxPlayerStore();
    player.isPlaying = false;
    player.currentTrack = null;
    const config = useConfigStore();
    config.jukeboxAnimatePlayerBackground = true;
  });

  it('closes via the dialog model and player button', async () => {
    const { wrapper } = await mountDialog();
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    await buttons[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);

    wrapper
      .findComponent(quasarStubs.QDialog)
      .vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([false]);

    wrapper.findComponent(quasarStubs.QDialog).vm.$emit('hide');
    wrapper.unmount();
  });

  it('navigates to the full jukebox view', async () => {
    const { wrapper, router } = await mountDialog();
    const push = vi.spyOn(router, 'push');

    await wrapper.findAll('button')[0].trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    expect(push).toHaveBeenCalledWith('/jukebox');
    wrapper.unmount();
  });

  it('builds gradient controls from the current track palette', async () => {
    const player = useJukeboxPlayerStore();
    player.currentTrack = {
      id: 't1',
      title: 'Track',
      palette: ['#101020', '#202040'],
    } as any;
    player.isPlaying = true;

    const { wrapper } = await mountDialog();
    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(true);
    expect(wrapper.find('.jukebox-dialog-card').classes()).toContain(
      'with-animated-bg',
    );
    expect(wrapper.find('.jukebox-dialog-card').exists()).toBe(true);

    wrapper.unmount();
  });

  it('falls back to the track color and hides the gradient on leave', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    player.currentTrack = { id: 't2', title: 'Track', color: '#abcdef' } as any;
    player.isPlaying = true;

    const { wrapper } = await mountDialog();
    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(true);

    config.jukeboxAnimatePlayerBackground = false;
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await nextTick();

    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(false);
    expect(wrapper.find('.jukebox-dialog-card').classes()).not.toContain(
      'has-gradient-bg',
    );
    wrapper.unmount();
  });

  it('renders without a gradient when no track is playing', async () => {
    const { wrapper } = await mountDialog();
    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(false);
    expect(wrapper.find('.jukebox-dialog-card').exists()).toBe(true);
    wrapper.unmount();
  });
});
