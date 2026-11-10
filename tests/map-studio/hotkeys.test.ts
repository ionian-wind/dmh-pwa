import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { useStudioHotkeys } from '@/map-studio/composables/useStudioHotkeys';

const actions = {
  save: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  setTool: vi.fn(),
  adjustSides: vi.fn(),
  setSides: vi.fn(),
  cycleRough: vi.fn(),
  toggleMode: vi.fn(),
  toggleSnap: vi.fn(),
  setDivision: vi.fn(),
  copySelection: vi.fn(),
  cutSelection: vi.fn(),
  pasteSelection: vi.fn(),
  groupSelection: vi.fn(),
  nudgeSelection: vi.fn(),
  sendToBack: vi.fn(),
  bringToFront: vi.fn(),
  hasObjectSelection: () => false,
  getTool: () => 'circle' as const,
};

const Harness = defineComponent({
  setup() {
    useStudioHotkeys(actions);
    return () => null;
  },
});

describe('map studio hotkeys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handles save, undo, redo and tool shortcuts', () => {
    const wrapper = mount(Harness);
    const press = (key: string, options: KeyboardEventInit = {}) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, ...options }));
    };

    press('s', { ctrlKey: true });
    expect(actions.save).toHaveBeenCalled();
    press('z', { ctrlKey: true });
    expect(actions.undo).toHaveBeenCalled();
    press('z', { ctrlKey: true, shiftKey: true });
    expect(actions.redo).toHaveBeenCalled();
    press('y', { metaKey: true });
    expect(actions.redo).toHaveBeenCalledTimes(2);
    press('r');
    expect(actions.setTool).toHaveBeenCalledWith('rectangle');
    press('c');
    expect(actions.setTool).toHaveBeenCalledWith('circle');
    press('p');
    expect(actions.setTool).toHaveBeenCalledWith('polygon');
    press('w');
    expect(actions.setTool).toHaveBeenCalledWith('wall');
    press('h');
    expect(actions.setTool).toHaveBeenCalledWith('pan');
    press('Delete');
    press('b');
    press('x');
    press('S', { shiftKey: true });
    press('x');
    press(']');
    expect(actions.adjustSides).toHaveBeenCalledWith(1);
    press('[');
    expect(actions.adjustSides).toHaveBeenCalledWith(-1);
    press('6');
    expect(actions.setSides).toHaveBeenCalledWith(6);
    press('R', { shiftKey: true });
    expect(actions.cycleRough).toHaveBeenCalled();
    press('e');
    expect(actions.toggleMode).toHaveBeenCalled();
    press('s');
    expect(actions.toggleSnap).toHaveBeenCalled();
    press('S', { shiftKey: true });
    press('3');
    expect(actions.setDivision).toHaveBeenCalledWith(3);
    press('b');
    press('6');
    expect(actions.setTool).toHaveBeenCalledWith('polygon');
    press('b');
    press('8');
    expect(actions.setTool).toHaveBeenCalledWith('select');
    press('b');
    press('1');
    expect(actions.setTool).toHaveBeenCalledWith('pan');
    wrapper.unmount();
  });

  it('ignores shortcuts while typing', () => {
    const wrapper = mount(Harness);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'r', bubbles: true }),
    );
    expect(actions.setTool).not.toHaveBeenCalledWith('rectangle');
    input.remove();
    wrapper.unmount();
  });
});

describe('map studio hotkey guards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ignores modified and unknown keys and non-editable targets', () => {
    const wrapper = mount(Harness);
    const press = (key: string, options: KeyboardEventInit = {}) =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key, ...options }));
    press('r', { altKey: true });
    press('x');
    expect(actions.setTool).not.toHaveBeenCalled();
    press('r');
    expect(actions.setTool).toHaveBeenCalledWith('rectangle');
    const noRough = defineComponent({
      setup() {
        useStudioHotkeys({ ...actions, cycleRough: undefined });
        return () => null;
      },
    });
    const roughWrapper = mount(noRough);
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'R', shiftKey: true }),
    );
    roughWrapper.unmount();
    wrapper.unmount();
  });
});

describe('map studio hotkey deletion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the selection with Delete or Backspace', () => {
    const deleteSelection = vi.fn();
    const HarnessDelete = defineComponent({
      setup() {
        useStudioHotkeys({ ...actions, deleteSelection });
        return () => null;
      },
    });
    const wrapper = mount(HarnessDelete);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    expect(deleteSelection).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(deleteSelection).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});

describe('map studio path radius hotkeys', () => {
  it('adjusts the path radius with bracket keys', () => {
    const adjustRadius = vi.fn();
    const HarnessPath = defineComponent({
      setup() {
        useStudioHotkeys({
          ...actions,
          getTool: () => 'path' as const,
          adjustRadius,
        });
        return () => null;
      },
    });
    const wrapper = mount(HarnessPath);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ']' }));
    expect(adjustRadius).toHaveBeenCalledWith(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '[' }));
    expect(adjustRadius).toHaveBeenCalledWith(-1);
    wrapper.unmount();
  });
});

describe('map studio object hotkeys', () => {
  it('handles copy, paste, group, nudge and z-order', () => {
    const HarnessObjects = defineComponent({
      setup() {
        useStudioHotkeys({
          ...actions,
          hasObjectSelection: () => true,
        });
        return () => null;
      },
    });
    const wrapper = mount(HarnessObjects);
    const press = (key: string, options: KeyboardEventInit = {}) =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key, ...options }));
    press('c', { ctrlKey: true });
    expect(actions.copySelection).toHaveBeenCalled();
    press('x', { ctrlKey: true });
    expect(actions.cutSelection).toHaveBeenCalled();
    press('v', { ctrlKey: true });
    expect(actions.pasteSelection).toHaveBeenCalled();
    press('g');
    expect(actions.groupSelection).toHaveBeenCalled();
    press('ArrowRight');
    expect(actions.nudgeSelection).toHaveBeenCalledWith(0.1, 0);
    press('ArrowLeft');
    expect(actions.nudgeSelection).toHaveBeenCalledWith(-0.1, 0);
    press('ArrowUp', { shiftKey: true });
    expect(actions.nudgeSelection).toHaveBeenCalledWith(0, -1);
    press('ArrowDown');
    expect(actions.nudgeSelection).toHaveBeenCalledWith(0, 0.1);
    press('[');
    expect(actions.sendToBack).toHaveBeenCalled();
    press(']');
    expect(actions.bringToFront).toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe('map studio stairs step hotkeys', () => {
  it('adjusts stair steps with brackets and digits', () => {
    const adjustSteps = vi.fn();
    const setSteps = vi.fn();
    const HarnessStairs = defineComponent({
      setup() {
        useStudioHotkeys({
          ...actions,
          getTool: () => 'stairs' as const,
          adjustSteps,
          setSteps,
        });
        return () => null;
      },
    });
    const wrapper = mount(HarnessStairs);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ']' }));
    expect(adjustSteps).toHaveBeenCalledWith(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '[' }));
    expect(adjustSteps).toHaveBeenCalledWith(-1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '6' }));
    expect(setSteps).toHaveBeenCalledWith(6);
    wrapper.unmount();
  });
});
