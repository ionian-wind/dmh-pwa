import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import SoundControlDialog from '@/jukebox/components/SoundControlDialog.vue';
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
  const wrapper = mount(SoundControlDialog, {
    props: { modelValue: true },
    global: {
      plugins: [router],
      stubs: { JukeboxPlayer: true },
    },
  });
  return { wrapper, router };
}

describe('SoundControlDialog', () => {
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
    expect(wrapper.find('.sound-control-card').classes()).toContain(
      'with-animated-bg',
    );
    expect(wrapper.find('.sound-control-card').exists()).toBe(true);

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
    await vi.waitFor(
      () =>
        expect(wrapper.find('.animated-gradient-layer').exists()).toBe(false),
      { timeout: 2000 },
    );
    expect(wrapper.find('.sound-control-card').classes()).not.toContain(
      'has-gradient-bg',
    );
    wrapper.unmount();
  });

  it('aligns the panel with the page content area', async () => {
    const router = makeRouter();
    await router.push('/');
    await router.isReady();
    const wrapper = mount(SoundControlDialog, {
      props: { modelValue: true, contentLeft: 300, contentWidth: 600 },
      global: {
        plugins: [router],
        stubs: { JukeboxPlayer: true },
      },
    });

    const frame = wrapper.find('.sound-control-frame');
    expect(frame.attributes('style')).toContain('width: 600px');
    expect(frame.attributes('style')).toContain('max-width: 600px');
    expect(wrapper.text()).toContain('Sound control');
    wrapper.unmount();
  });

  it('renders without a gradient when no track is playing', async () => {
    const { wrapper } = await mountDialog();
    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(false);
    expect(wrapper.find('.sound-control-card').exists()).toBe(true);
    wrapper.unmount();
  });
});
