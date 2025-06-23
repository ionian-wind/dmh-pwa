import { mount } from '@vue/test-utils';
import ModuleSelector from '@/components/ModuleSelector.vue';
import { vi } from 'vitest';

vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({ modules: [
    { id: 'mod-1', name: 'Module One' },
    { id: 'mod-2', name: 'Module Two' }
  ] })
}));

describe('ModuleSelector', () => {
  it('renders options including placeholder and modules', () => {
    const wrapper = mount(ModuleSelector, { props: { modelValue: null } });
    const options = wrapper.findAll('option');
    expect(options[0].text()).toContain('No Module');
    expect(options[1].text()).toContain('Module One');
    expect(options[2].text()).toContain('Module Two');
  });

  it('emits update:modelValue when selection changes', async () => {
    const wrapper = mount(ModuleSelector, { props: { modelValue: null } });
    await wrapper.find('select').setValue('mod-2');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0][0]).toBe('mod-2');
  });

  it('shows custom placeholder if provided', () => {
    const wrapper = mount(ModuleSelector, { props: { modelValue: null, placeholder: 'Choose a module' } });
    expect(wrapper.find('option').text()).toBe('Choose a module');
  });
}); 