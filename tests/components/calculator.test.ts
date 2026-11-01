import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import CalculatorView from '@/calculator/CalculatorView.vue';

async function mountCalculator() {
  const wrapper = mount(CalculatorView, { props: { modelValue: true } });
  await nextTick();
  return wrapper;
}

describe('CalculatorView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn() },
    });
  });

  it('calculates expressions via the keypad and handles errors', async () => {
    const wrapper = await mountCalculator();
    const vm = wrapper.vm as any;

    vm.append('1');
    vm.append('+');
    vm.append('2');
    vm.calculate();
    await nextTick();
    expect(wrapper.find('.calculator-input').text()).toBe('1+2');
    expect(wrapper.find('.calculator-result').text()).toContain('= 3');

    vm.clear();
    vm.append('1');
    vm.append('÷');
    vm.append('2');
    vm.calculate();
    await nextTick();
    expect(wrapper.find('.calculator-result').text()).toContain('= 0.5');

    vm.append('bad');
    vm.calculate();
    await nextTick();
    expect(wrapper.find('.calculator-error').exists()).toBe(true);

    vm.backspace();
    await nextTick();
    expect(wrapper.find('.calculator-input').text()).not.toContain('bad');
    wrapper.unmount();
  });

  it('handles keyboard input while open and ignores it when closed', async () => {
    const wrapper = await mountCalculator();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '7' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '*' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '8' }));
    await nextTick();
    expect(wrapper.find('.calculator-input').text()).toBe('7×8');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await nextTick();
    expect(wrapper.find('.calculator-result').text()).toContain('= 56');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    await nextTick();
    expect(wrapper.find('.calculator-input').text()).toBe('7×');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    await nextTick();
    expect(wrapper.find('.calculator-input').text()).toBe('0');

    await wrapper.setProps({ modelValue: false });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }));
    await nextTick();
    expect(wrapper.find('.calculator-input').text()).toBe('0');
    wrapper.unmount();
  });

  it('inserts balanced parentheses', async () => {
    const wrapper = await mountCalculator();
    const vm = wrapper.vm as any;

    vm.append('+');
    vm.appendBrace();
    await nextTick();
    expect(wrapper.find('.calculator-input').text()).toBe('+(');
    vm.appendBrace();
    await nextTick();
    expect(wrapper.find('.calculator-input').text()).toBe('+()');
    vm.appendBrace();
    await nextTick();
    expect(wrapper.find('.calculator-input').text()).toBe('+()(');
    wrapper.unmount();
  });

  it('converts units, copies values and clears state on unmount', async () => {
    const wrapper = await mountCalculator();
    const vm = wrapper.vm as any;

    expect(vm.convertResult('100', 'cm', 'm')).toBe(1);
    expect(vm.convertResult('bad', 'cm', 'm')).toBe('');
    expect(vm.convertResult('1', 'not-a-unit', 'm')).toBe('');
    expect(vm.convertResult('1', 'm', 'not-a-unit')).toBe('');

    vm.copyToClipboard(42);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('42');

    vm.unitBase = 'length';
    vm.sourceUnit = 'm';
    await nextTick();
    expect(vm.unitBase).toBe('length');

    wrapper.unmount();
    expect(vm.unitBase).toBe('');
    expect(vm.sourceUnit).toBe('');
  });
});
