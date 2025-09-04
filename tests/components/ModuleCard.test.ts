import { mount } from '@vue/test-utils';
import ModuleCard from '../../src/modules/ModuleCard.vue';

describe('ModuleCard', () => {
  const module = { id: 'm1', name: 'Test Module', description: 'A module', createdAt: 0, updatedAt: 0 };

  it('renders module name and description', () => {
    const wrapper = mount(ModuleCard, { props: { module } });
    expect(wrapper.text()).toContain('Test Module');
    expect(wrapper.text()).toContain('A module');
  });

  it('emits view, edit, and delete events', async () => {
    const wrapper = mount(ModuleCard, { props: { module } });
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('view');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('edit');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('delete');
    expect(wrapper.emitted('view')).toBeTruthy();
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('view')[0][0]).toEqual(module);
    expect(wrapper.emitted('edit')[0][0]).toEqual(module);
    expect(wrapper.emitted('delete')[0][0]).toEqual(module);
  });
}); 
