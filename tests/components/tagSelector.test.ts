import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import TagSelector from '@/components/common/TagSelector.vue';
import { useNoteStore } from '@/stores/notes';

function seedTags(tags: string[]) {
  const store = useNoteStore();
  store.items = tags.map((tag, index) => ({
    id: `n${index}`,
    title: `Note ${index}`,
    content: '',
    contentType: 'text' as const,
    typeId: null,
    tags: [tag],
    moduleIds: [],
    hidden: false,
    createdAt: index,
    updatedAt: index,
  }));
}

describe('TagSelector suggestions', () => {
  it('shows matching existing tags and excludes selected ones', async () => {
    seedTags(['campaign', 'combat', 'camping']);
    const wrapper = mount(TagSelector, {
      props: { modelValue: ['combat'] },
    });

    const input = wrapper.find('input');
    await input.setValue('cam');
    await nextTick();

    const text = wrapper.text();
    expect(text).toContain('#campaign');
    expect(text).toContain('#camping');
    expect(text).not.toContain('#combat');
    wrapper.unmount();
  });

  it('keeps suggestions open on the first focus', async () => {
    seedTags(['campaign']);
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('input').trigger('focus');
    await nextTick();

    expect(wrapper.find('.tag-suggestion-item').text()).toContain('#campaign');
    wrapper.unmount();
  });

  it('shows a create option when the query is not an existing tag', async () => {
    seedTags(['campaign']);
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('input').setValue('cam');
    await nextTick();

    expect(wrapper.find('.tag-create-option').text()).toContain('Create #cam');
    expect(wrapper.find('.tag-create-option').text()).not.toContain(
      'Create #campaign',
    );
    wrapper.unmount();
  });

  it('adds a clicked suggestion', async () => {
    seedTags(['campaign', 'camping']);
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('input').setValue('cam');
    await nextTick();
    await wrapper.find('.tag-suggestion-item').trigger('click');

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual([
      'campaign',
    ]);
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });

  it('creates a new tag from the create option', async () => {
    seedTags(['campaign']);
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('input').setValue('newtag');
    await nextTick();
    await wrapper.find('.tag-create-option').trigger('click');

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual([
      'newtag',
    ]);
    wrapper.unmount();
  });

  it('uses arrow keys to select a suggestion and Enter to add it', async () => {
    seedTags(['campaign']);
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('input').setValue('cam');
    await nextTick();
    await wrapper.find('input').trigger('keydown.down');
    await wrapper.find('input').trigger('keydown.enter');

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual([
      'campaign',
    ]);
    wrapper.unmount();
  });

  it('creates the typed tag on Enter when no suggestion is selected', async () => {
    seedTags(['campaign']);
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('input').setValue('cam');
    await nextTick();
    await wrapper.find('input').trigger('keydown.enter');

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['cam']);
    wrapper.unmount();
  });

  it('removes a tag chip', async () => {
    const wrapper = mount(TagSelector, {
      props: { modelValue: ['one', 'two'] },
    });

    await wrapper.findAll('svg')[0].trigger('click');

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['two']);
    wrapper.unmount();
  });

  it('shows an empty suggestion state and handles navigation without options', async () => {
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('input').trigger('focus');
    await wrapper.find('input').trigger('keydown.down');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();

    expect(wrapper.find('.tag-suggestions-empty').text()).toContain(
      'No tags yet',
    );
    expect(wrapper.find('.tag-create-option').exists()).toBe(false);
    wrapper.unmount();
  });

  it('navigates suggestions with arrow keys and highlights on hover', async () => {
    seedTags(['alpha', 'beta']);
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('input').trigger('focus');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();

    await wrapper.find('input').trigger('keydown.up');
    expect(wrapper.findAll('.tag-suggestion-item').at(-1).classes()).toContain(
      'tag-suggestion-active',
    );

    await wrapper.find('input').trigger('keydown.up');
    expect(wrapper.findAll('.tag-suggestion-item')[0].classes()).toContain(
      'tag-suggestion-active',
    );

    await wrapper.find('.tag-suggestion-item').trigger('mouseenter');
    await wrapper.find('input').setValue('new');
    await nextTick();
    await wrapper.find('.tag-create-option').trigger('mouseenter');
    wrapper.unmount();
  });

  it('closes suggestions with Escape and keeps them open on repeated clicks', async () => {
    seedTags(['campaign']);
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('input').trigger('focus');
    await nextTick();
    expect(wrapper.find('.tag-suggestions-list').exists()).toBe(true);

    await wrapper.find('input').trigger('focus');
    await nextTick();
    expect(wrapper.find('.tag-suggestions-list').exists()).toBe(true);

    await wrapper.find('input').trigger('keydown.esc');
    await nextTick();
    expect(wrapper.find('.tag-suggestions-list').exists()).toBe(false);
    wrapper.unmount();
  });

  it('ignores an empty add action', async () => {
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });
});
