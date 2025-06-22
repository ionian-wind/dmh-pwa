import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import JukeboxButton from '@/components/JukeboxButton.vue';

// Mock the router
const mockRoute = {
  path: '/home'
};

jest.mock('vue-router', () => ({
  useRoute: () => mockRoute
}));

// Mock the jukebox player store
const mockPlayerStore = {
  isPlaying: false
};

jest.mock('@/jukebox/playerStore', () => ({
  useJukeboxPlayerStore: () => mockPlayerStore
}));

describe('JukeboxButton', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders the jukebox button', () => {
    wrapper = mount(JukeboxButton);
    expect(wrapper.find('.float-action-button').exists()).toBe(true);
    expect(wrapper.find('.si-music-note').exists()).toBe(true);
  });

  it('opens popover when clicked', async () => {
    wrapper = mount(JukeboxButton);
    
    const button = wrapper.find('.float-action-button');
    await button.trigger('click');
    
    await nextTick();
    expect(wrapper.vm.isPopoverOpen).toBe(true);
  });

  it('closes popover when close event is emitted', async () => {
    wrapper = mount(JukeboxButton);
    
    // Open popover first
    const button = wrapper.find('.float-action-button');
    await button.trigger('click');
    await nextTick();
    
    expect(wrapper.vm.isPopoverOpen).toBe(true);
    
    // Simulate close event by clicking the button again
    await button.trigger('click');
    await nextTick();
    
    expect(wrapper.vm.isPopoverOpen).toBe(false);
  });

  it('does not render when on jukebox page', () => {
    // Mock being on jukebox page
    mockRoute.path = '/jukebox';
    
    wrapper = mount(JukeboxButton);
    expect(wrapper.find('.popover-container').exists()).toBe(false);
    
    // Reset mock
    mockRoute.path = '/home';
  });

  it('applies playing class when music is playing', async () => {
    mockPlayerStore.isPlaying = true;
    
    wrapper = mount(JukeboxButton);
    await nextTick();
    
    const button = wrapper.find('.float-action-button');
    expect(button.classes()).toContain('jukebox-button--playing');
    
    // Reset mock
    mockPlayerStore.isPlaying = false;
  });
}); 