import { mount } from '@vue/test-utils';
import TagSelector from '@/components/TagSelector.vue';

describe('TagSelector', () => {
  it('renders tags and input', () => {
    const wrapper = mount(TagSelector, { props: { modelValue: ['foo', 'bar'] } });
    expect(wrapper.findAll('.tag').length).toBe(2);
    expect(wrapper.find('input').exists()).toBe(true);
  });

  it('adds a tag on enter', async () => {
    const wrapper = mount(TagSelector, { props: { modelValue: [] } });
    await wrapper.find('input').setValue('baz');
    await wrapper.find('input').trigger('keydown.enter');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0][0]).toContain('baz');
  });

  it('removes a tag when remove button is clicked', async () => {
    const wrapper = mount(TagSelector, { props: { modelValue: ['foo', 'bar'] } });
    await wrapper.findAll('.tag button')[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0][0]).not.toContain('foo');
  });
}); 