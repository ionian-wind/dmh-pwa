import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
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

function createDragHarness(wrapper: ReturnType<typeof mount>) {
  const card = wrapper.find('.sound-control-card');
  const cardElement = card.element as HTMLElement;
  const handleElement = wrapper.find('.drag-handle').element as HTMLElement;
  const cardRectSpy = vi.spyOn(cardElement, 'getBoundingClientRect');
  let activePointerId = 1;
  let pointerCounter = 0;

  Object.defineProperty(handleElement, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(handleElement, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  });

  const dispatch = (
    target: HTMLElement,
    type: string,
    clientX: number,
    clientY: number,
    pointerId: number,
  ) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      clientX,
      clientY,
    });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    target.dispatchEvent(event);
  };

  const setCardRect = (top: number, height = 200, width = 600) => {
    cardRectSpy.mockReturnValue({
      x: 0,
      y: top,
      left: 0,
      top,
      right: width,
      bottom: top + height,
      width,
      height,
      toJSON: () => ({}),
    });
  };

  const setHandleRect = (
    left: number,
    top: number,
    width = 300,
    height = 50,
  ) => {
    const handle = cardElement.querySelector('.drag-handle') as HTMLElement;
    vi.spyOn(handle, 'getBoundingClientRect').mockReturnValue({
      x: left,
      y: top,
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      toJSON: () => ({}),
    });
  };

  const start = (clientX = 0, clientY = 0) => {
    pointerCounter += 1;
    activePointerId = pointerCounter;
    dispatch(handleElement, 'pointerdown', clientX, clientY, activePointerId);
  };

  const move = (clientX: number, clientY: number) => {
    dispatch(cardElement, 'pointermove', clientX, clientY, activePointerId);
  };

  const up = (clientX: number, clientY: number) => {
    dispatch(cardElement, 'pointerup', clientX, clientY, activePointerId);
  };

  return {
    card,
    cardElement,
    handleElement,
    setCardRect,
    setHandleRect,
    start,
    move,
    up,
  };
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
    wrapper.unmount();
  });

  it('switches between bottom panel and floating dialog by drag position', async () => {
    const { wrapper } = await mountDialog();
    const viewportHeight = window.innerHeight;
    const card = wrapper.find('.sound-control-card');
    const cardElement = card.element as HTMLElement;
    const handleElement = wrapper.find('.drag-handle').element as HTMLElement;
    Object.defineProperty(handleElement, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    vi.spyOn(cardElement, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: viewportHeight - 230,
      left: 0,
      top: viewportHeight - 230,
      right: 600,
      bottom: viewportHeight - 30,
      width: 600,
      height: 200,
      toJSON: () => ({}),
    });

    const dispatch = (
      type: string,
      clientX: number,
      clientY: number,
      pointerId = 1,
    ) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX,
        clientY,
      });
      Object.defineProperty(event, 'pointerId', { value: pointerId });
      cardElement.dispatchEvent(event);
    };

    const startDrag = (pointerId: number) => {
      const event = new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      });
      Object.defineProperty(event, 'pointerId', { value: pointerId });
      handleElement.dispatchEvent(event);
    };

    startDrag(1);
    dispatch('pointermove', 0, -30);
    await flushPromises();

    expect(card.attributes('data-mode')).toBe('dialog');

    dispatch('pointerup', 0, -30, 1);
    await flushPromises();
    expect(card.classes()).toContain('is-dialog');

    const frame = wrapper.find('.sound-control-frame');
    expect(frame.attributes('style')).toContain(
      'translateY(calc(-50vh + 50%))',
    );

    vi.spyOn(cardElement, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: viewportHeight - 200,
      left: 0,
      top: viewportHeight - 200,
      right: 600,
      bottom: viewportHeight,
      width: 600,
      height: 200,
      toJSON: () => ({}),
    });

    startDrag(2);
    dispatch('pointermove', 0, 100);
    await flushPromises();

    expect(card.attributes('data-mode')).toBe('panel');

    dispatch('pointerup', 0, 100, 2);
    await flushPromises();
    expect(card.classes()).not.toContain('is-dialog');
    wrapper.unmount();
  });

  it('does not dock until the detached dialog leaves the detach zone', async () => {
    const { wrapper } = await mountDialog();
    const viewportHeight = window.innerHeight;
    const card = wrapper.find('.sound-control-card');
    const cardElement = card.element as HTMLElement;
    const handleElement = wrapper.find('.drag-handle').element as HTMLElement;
    Object.defineProperty(handleElement, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    const dockedTop = viewportHeight - 200;
    const setTop = (top: number) => {
      vi.spyOn(cardElement, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: top,
        left: 0,
        top,
        right: 600,
        bottom: top + 200,
        width: 600,
        height: 200,
        toJSON: () => ({}),
      });
    };

    const dispatch = (
      type: string,
      clientX: number,
      clientY: number,
      pointerId = 1,
    ) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX,
        clientY,
      });
      Object.defineProperty(event, 'pointerId', { value: pointerId });
      cardElement.dispatchEvent(event);
    };

    const startDrag = (pointerId: number) => {
      const event = new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      });
      Object.defineProperty(event, 'pointerId', { value: pointerId });
      handleElement.dispatchEvent(event);
    };

    setTop(dockedTop - 6);
    startDrag(1);
    dispatch('pointermove', 0, -6);
    await flushPromises();
    expect(card.attributes('data-mode')).toBe('dialog');

    // Still inside the 20px detach zone: dragging down must not dock.
    dispatch('pointermove', 0, 100);
    await flushPromises();
    expect(card.attributes('data-mode')).toBe('dialog');

    // Leaving the detach zone arms the snap catcher.
    setTop(dockedTop - 40);
    dispatch('pointermove', 0, -10);
    await flushPromises();

    setTop(dockedTop - 10);
    dispatch('pointermove', 0, 100);
    await flushPromises();
    expect(card.attributes('data-mode')).toBe('panel');

    // Docking ends the gesture; further pointer movement must not re-detach it.
    dispatch('pointermove', 0, -120, 1);
    await flushPromises();
    expect(card.attributes('data-mode')).toBe('panel');

    dispatch('pointerup', 0, 100, 1);
    await flushPromises();
    wrapper.unmount();
  });

  it('cycles detach, dock and detach again across separate gestures', async () => {
    const { wrapper } = await mountDialog();
    const viewportHeight = window.innerHeight;
    const drag = createDragHarness(wrapper);

    drag.setCardRect(viewportHeight - 200);
    drag.start();
    drag.move(0, -6);
    await flushPromises();
    expect(drag.card.attributes('data-mode')).toBe('dialog');

    // Leave the dock zone, then come back into it to dock.
    drag.setCardRect(viewportHeight - 240);
    drag.move(0, -10);
    await flushPromises();
    drag.setCardRect(viewportHeight - 210);
    drag.move(0, 100);
    await flushPromises();
    expect(drag.card.attributes('data-mode')).toBe('panel');
    drag.up(0, 100);
    await flushPromises();

    // A new gesture must detach again from the docked panel.
    drag.setCardRect(viewportHeight - 200);
    drag.start();
    drag.move(0, -6);
    await flushPromises();
    expect(drag.card.attributes('data-mode')).toBe('dialog');

    drag.up(0, -6);
    await flushPromises();
    wrapper.unmount();
  });

  it('stays detached when released inside the snap zone before arming', async () => {
    const { wrapper } = await mountDialog();
    const viewportHeight = window.innerHeight;
    const drag = createDragHarness(wrapper);

    // Detach while the dialog bottom is still inside the 10 px snap zone.
    drag.setCardRect(viewportHeight - 206);
    drag.start();
    drag.move(0, -6);
    await flushPromises();
    expect(drag.card.attributes('data-mode')).toBe('dialog');

    drag.move(0, 100);
    await flushPromises();
    expect(drag.card.attributes('data-mode')).toBe('dialog');

    drag.up(0, 100);
    await flushPromises();
    expect(drag.card.attributes('data-mode')).toBe('dialog');

    // A later gesture can leave the zone and then dock.
    drag.start();
    drag.setCardRect(viewportHeight - 240);
    drag.move(0, -10);
    await flushPromises();
    drag.setCardRect(viewportHeight - 210);
    drag.move(0, 100);
    await flushPromises();
    expect(drag.card.attributes('data-mode')).toBe('panel');

    drag.up(0, 100);
    await flushPromises();
    wrapper.unmount();
  });

  it('reopens in the docked panel state after being detached', async () => {
    const { wrapper } = await mountDialog();
    const viewportHeight = window.innerHeight;
    const drag = createDragHarness(wrapper);

    drag.setCardRect(viewportHeight - 206);
    drag.start();
    drag.move(0, -6);
    await flushPromises();
    expect(drag.card.attributes('data-mode')).toBe('dialog');
    drag.up(0, -6);
    await flushPromises();

    await wrapper.setProps({ modelValue: false });
    await nextTick();
    await wrapper.setProps({ modelValue: true });
    await flushPromises();

    expect(drag.card.attributes('data-mode')).toBe('panel');
    expect(drag.card.classes()).not.toContain('is-dialog');

    drag.start();
    drag.move(0, -6);
    await flushPromises();
    expect(drag.card.attributes('data-mode')).toBe('dialog');
    drag.up(0, -6);
    await flushPromises();
    wrapper.unmount();
  });

  it('places the detached header centre under the pointer', async () => {
    const { wrapper } = await mountDialog();
    const viewportHeight = window.innerHeight;
    const drag = createDragHarness(wrapper);

    drag.setCardRect(viewportHeight - 200);
    drag.setHandleRect(500, 800, 300, 50);
    drag.start(100, 200);
    drag.move(100, 194);
    await flushPromises();

    expect(drag.card.attributes('data-mode')).toBe('dialog');
    expect(drag.card.attributes('style')).toContain(
      'translate(-550px, -637px)',
    );

    drag.up(100, 194);
    await flushPromises();
    wrapper.unmount();
  });

  it('renders without a gradient when no track is playing', async () => {
    const { wrapper } = await mountDialog();
    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(false);
    expect(wrapper.find('.sound-control-card').exists()).toBe(true);
    wrapper.unmount();
  });
});
