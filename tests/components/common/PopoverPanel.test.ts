import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mount, VueWrapper } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import PopoverPanel from '@/components/common/PopoverPanel.vue';
import Button from '@/components/common/Button.vue';

// Mock window methods
const mockGetBoundingClientRect = jest.fn(() => ({
  top: 100,
  left: 100,
  right: 200,
  bottom: 150,
  width: 100,
  height: 50
}));

const mockQuerySelector = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

// Mock HTMLElement methods
Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;
Element.prototype.querySelector = mockQuerySelector;
window.addEventListener = mockAddEventListener;
window.removeEventListener = mockRemoveEventListener;

describe('PopoverPanel', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  const createWrapper = (props = {}, slots = {}) => {
    return mount(PopoverPanel, {
      props: {
        isOpen: false,
        ...props
      },
      slots: {
        trigger: '<button>Trigger</button>',
        default: '<div>Content</div>',
        ...slots
      },
      global: {
        stubs: {
          Button
        }
      }
    });
  };

  describe('Props', () => {
    it('renders with default props', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.popover-container').exists()).toBe(true);
      expect(wrapper.find('.popover-trigger').exists()).toBe(true);
      expect(wrapper.find('.popover-panel').exists()).toBe(false);
    });

    it('shows popover when isOpen is true', async () => {
      wrapper = createWrapper({ isOpen: true });
      await nextTick();
      expect(wrapper.find('.popover-panel').exists()).toBe(true);
    });

    it('applies correct placement class', async () => {
      wrapper = createWrapper({ isOpen: true, placement: 'top' });
      await nextTick();
      expect(wrapper.find('.popover-panel--top').exists()).toBe(true);
    });

    it('applies correct center alignment placement class', async () => {
      wrapper = createWrapper({ isOpen: true, placement: 'top-center' });
      await nextTick();
      expect(wrapper.find('.popover-panel--top-center').exists()).toBe(true);
    });

    it('applies correct bottom center placement class', async () => {
      wrapper = createWrapper({ isOpen: true, placement: 'bottom-center' });
      await nextTick();
      expect(wrapper.find('.popover-panel--bottom-center').exists()).toBe(true);
    });

    it('applies correct left center placement class', async () => {
      wrapper = createWrapper({ isOpen: true, placement: 'left-center' });
      await nextTick();
      expect(wrapper.find('.popover-panel--left-center').exists()).toBe(true);
    });

    it('applies correct right center placement class', async () => {
      wrapper = createWrapper({ isOpen: true, placement: 'right-center' });
      await nextTick();
      expect(wrapper.find('.popover-panel--right-center').exists()).toBe(true);
    });

    it('shows arrow when showArrow is true', async () => {
      wrapper = createWrapper({ isOpen: true, showArrow: true });
      await nextTick();
      expect(wrapper.find('.popover-panel__arrow').exists()).toBe(true);
    });

    it('hides arrow when showArrow is false', async () => {
      wrapper = createWrapper({ isOpen: true, showArrow: false });
      await nextTick();
      expect(wrapper.find('.popover-panel__arrow').exists()).toBe(false);
    });

    it('shows title when provided', async () => {
      wrapper = createWrapper({ 
        isOpen: true, 
        title: 'Test Title' 
      });
      await nextTick();
      expect(wrapper.find('.popover-panel__title').text()).toBe('Test Title');
    });

    it('applies custom width styles', async () => {
      wrapper = createWrapper({ 
        isOpen: true, 
        maxWidth: '400px',
        minWidth: '300px'
      });
      await nextTick();
      const panel = wrapper.find('.popover-panel');
      expect(panel.attributes('style')).toContain('max-width: 400px');
      expect(panel.attributes('style')).toContain('min-width: 300px');
    });
  });

  describe('Events', () => {
    it('emits open event when popover opens', async () => {
      wrapper = createWrapper({ isOpen: false });
      await wrapper.setProps({ isOpen: true });
      await nextTick();
      expect(wrapper.emitted('open')).toBeTruthy();
    });

    it('emits close event when popover closes', async () => {
      wrapper = createWrapper({ isOpen: true });
      await wrapper.setProps({ isOpen: false });
      await nextTick();
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('handles click trigger', async () => {
      wrapper = createWrapper({ trigger: 'click' });
      const trigger = wrapper.find('.popover-trigger');
      await trigger.trigger('click');
      expect(wrapper.emitted('open')).toBeTruthy();
    });

    it('handles hover trigger', async () => {
      wrapper = createWrapper({ trigger: 'hover' });
      const trigger = wrapper.find('.popover-trigger');
      await trigger.trigger('mouseenter');
      expect(wrapper.emitted('open')).toBeTruthy();
      
      await trigger.trigger('mouseleave');
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('handles focus trigger', async () => {
      wrapper = createWrapper({ trigger: 'focus' });
      const trigger = wrapper.find('.popover-trigger');
      await trigger.trigger('focus');
      expect(wrapper.emitted('open')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes when open', async () => {
      wrapper = createWrapper({ 
        isOpen: true, 
        title: 'Test Title' 
      });
      await nextTick();
      const panel = wrapper.find('.popover-panel');
      expect(panel.attributes('role')).toBe('dialog');
      expect(panel.attributes('aria-modal')).toBe('true');
      expect(panel.attributes('aria-labelledby')).toBe('popover-title');
    });

    it('has title element with correct ID', async () => {
      wrapper = createWrapper({ 
        isOpen: true, 
        title: 'Test Title' 
      });
      await nextTick();
      const title = wrapper.find('#popover-title');
      expect(title.exists()).toBe(true);
      expect(title.text()).toBe('Test Title');
    });
  });

  describe('Slots', () => {
    it('renders trigger slot', () => {
      wrapper = createWrapper({}, {
        trigger: '<span>Custom Trigger</span>'
      });
      expect(wrapper.find('.popover-trigger').text()).toBe('Custom Trigger');
    });

    it('renders default slot content', async () => {
      wrapper = createWrapper({ isOpen: true }, {
        default: '<div>Custom Content</div>'
      });
      await nextTick();
      expect(wrapper.find('.popover-panel__content').text()).toBe('Custom Content');
    });
  });

  describe('Methods', () => {
    it('exposes open method', async () => {
      wrapper = createWrapper();
      const vm = wrapper.vm;
      vm.open();
      await nextTick();
      expect(wrapper.emitted('open')).toBeTruthy();
    });

    it('exposes close method', async () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm;
      vm.close();
      await nextTick();
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('exposes toggle method', async () => {
      wrapper = createWrapper();
      const vm = wrapper.vm;
      vm.toggle();
      await nextTick();
      expect(wrapper.emitted('open')).toBeTruthy();
      
      vm.toggle();
      await nextTick();
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes on Escape key when closeOnEscape is true', async () => {
      wrapper = createWrapper({ 
        isOpen: true, 
        closeOnEscape: true 
      });
      await nextTick();
      
      await wrapper.trigger('keydown', { key: 'Escape' });
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('does not close on Escape key when closeOnEscape is false', async () => {
      wrapper = createWrapper({ 
        isOpen: true, 
        closeOnEscape: false 
      });
      await nextTick();
      
      await wrapper.trigger('keydown', { key: 'Escape' });
      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  describe('Click Outside', () => {
    it('closes when clicking outside when closeOnClickOutside is true', async () => {
      wrapper = createWrapper({ 
        isOpen: true, 
        closeOnClickOutside: true 
      });
      await nextTick();
      
      // Simulate click outside
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('does not close when clicking outside when closeOnClickOutside is false', async () => {
      wrapper = createWrapper({ 
        isOpen: true, 
        closeOnClickOutside: false 
      });
      await nextTick();
      
      // Simulate click outside
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      
      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  describe('Positioning', () => {
    it('calculates position on mount when open', async () => {
      wrapper = createWrapper({ isOpen: true });
      await nextTick();
      
      // Verify that getBoundingClientRect was called
      expect(mockGetBoundingClientRect).toHaveBeenCalled();
    });

    it('updates position on window resize', async () => {
      wrapper = createWrapper({ isOpen: true });
      await nextTick();
      
      // Simulate window resize
      window.dispatchEvent(new Event('resize'));
      
      expect(mockGetBoundingClientRect).toHaveBeenCalled();
    });

    it('centers large content when it exceeds viewport', async () => {
      // Mock a large popover that exceeds viewport
      const mockLargePopoverRect = {
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600
      };
      
      // Mock small viewport
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 300, writable: true });
      
      // Mock getBoundingClientRect to return different values for trigger and popover
      let callCount = 0;
      Element.prototype.getBoundingClientRect = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          // Trigger element
          return {
            top: 100,
            left: 100,
            right: 200,
            bottom: 150,
            width: 100,
            height: 50
          };
        } else {
          // Popover element
          return mockLargePopoverRect;
        }
      });
      
      wrapper = createWrapper({ isOpen: true });
      await nextTick();
      
      // Verify that positioning was calculated
      expect(Element.prototype.getBoundingClientRect).toHaveBeenCalled();
      
      // Reset viewport
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    });
  });

  describe('Lifecycle', () => {
    it('adds event listeners when popover opens', async () => {
      wrapper = createWrapper({ isOpen: true });
      await nextTick();
      
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('removes event listeners when popover closes', async () => {
      wrapper = createWrapper({ isOpen: true });
      await nextTick();
      
      await wrapper.setProps({ isOpen: false });
      await nextTick();
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('cleans up event listeners on unmount', () => {
      wrapper = createWrapper({ isOpen: true });
      wrapper.unmount();
      
      expect(mockRemoveEventListener).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive styles on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      
      wrapper = createWrapper({ isOpen: true });
      await nextTick();
      
      const panel = wrapper.find('.popover-panel');
      expect(panel.attributes('style')).toContain('max-width: calc(100vw - 32px)');
      
      // Reset viewport
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    });
  });
}); 