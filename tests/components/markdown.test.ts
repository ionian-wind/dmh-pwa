import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { h, nextTick } from 'vue';

import Markdown from '@/components/common/Markdown.vue';
import { useModalState } from '@/composables/useModalState';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

async function mountMarkdown(props: Record<string, any>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => h('div') } },
      { path: '/notes/:id', component: { render: () => h('div') } },
      { path: '/monsters/:id', component: { render: () => h('div') } },
    ],
  });
  await router.push('/');
  await router.isReady();

  const wrapper = mount(Markdown, {
    props,
    global: { plugins: [router] },
  });
  await flushPromises();
  return { wrapper, router };
}

describe('Markdown', () => {
  beforeEach(() => {
    resetMockStores();
  });

  it('renders markdown and reuses parsed content from cache', async () => {
    const { wrapper } = await mountMarkdown({ content: '# Title\n\nBody' });
    expect(wrapper.html()).toContain('<h1');
    expect(wrapper.text()).toContain('Body');

    await wrapper.setProps({ content: '# Title\n\nBody' });
    expect(wrapper.text()).toContain('Body');
  });

  it('scrolls to an anchor link when the anchor exists', async () => {
    const scrollToAnchor = vi.fn();
    const { wrapper } = await mountMarkdown({
      content: '[Goblin](monster://m1)',
      anchorMap: new Set(['m1']),
      scrollToAnchor,
    });

    const root = wrapper.find('.markdown-content').element;
    const anchor = document.createElement('div');
    anchor.id = 'm1';
    root.appendChild(anchor);

    await wrapper.find('.internal-link').trigger('click');
    expect(scrollToAnchor).toHaveBeenCalledWith('m1', anchor);
  });

  it('opens the mention modal for internal links when enabled', async () => {
    seedMockStore('monsters', [{ id: 'm1', name: 'Goblin' }]);
    const modal = useModalState();
    const { wrapper } = await mountMarkdown({
      content: '[Goblin](monster://m1)',
      enableMentionModal: true,
    });

    await wrapper.find('.internal-link').trigger('click');
    await nextTick();

    expect(modal.currentMentionModal.value).toMatchObject({
      kind: 'monster',
      entity: { id: 'm1' },
    });
    modal.closeMentionModal(
      modal.currentMentionModal.value?.modalId ?? 'missing',
    );
  });

  it('falls back to SPA navigation for regular internal links', async () => {
    const pushState = vi.spyOn(history, 'pushState');
    const { wrapper } = await mountMarkdown({
      content: '[Goblin](monster://m1)',
    });

    await wrapper.find('.internal-link').trigger('click');
    expect(pushState).toHaveBeenCalledWith(history.state, '', '/monsters/m1');
  });

  it('toggles task checkboxes into new markdown content', async () => {
    const { wrapper } = await mountMarkdown({
      content: '- [ ] Task one\n- [x] Task two',
      taskCheckboxEnabled: true,
    });

    const input = wrapper.find('input.task-list-checkbox');
    expect(input.exists()).toBe(true);
    (input.element as HTMLInputElement).checked = true;
    await input.trigger('change');

    expect(wrapper.emitted('update:content')?.[0]).toEqual([
      '- [x] Task one\n- [x] Task two',
    ]);

    await wrapper.setProps({ taskCheckboxEnabled: false });
    await wrapper.setProps({ taskCheckboxEnabled: true });
  });

  it('ignores checkbox changes while task mode is disabled', async () => {
    const { wrapper } = await mountMarkdown({
      content: '- [ ] Task',
      taskCheckboxEnabled: false,
    });

    const input = wrapper.find('input.task-list-checkbox');
    (input.element as HTMLInputElement).checked = true;
    await input.trigger('change');
    expect(wrapper.emitted('update:content')).toBeUndefined();
  });
});
