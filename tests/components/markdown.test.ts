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

  it('resolves mentions for every entity kind', async () => {
    seedMockStore('notes', [{ id: 'n1', title: 'Note' }]);
    seedMockStore('modules', [{ id: 'mod1', name: 'Module' }]);
    seedMockStore('parties', [{ id: 'p1', name: 'Party' }]);
    seedMockStore('monsters', [{ id: 'mo1', name: 'Monster' }]);
    seedMockStore('encounters', [{ id: 'e1', name: 'Encounter' }]);

    const modal = useModalState();
    const { wrapper } = await mountMarkdown({
      content: [
        '[Note](note://n1)',
        '[Module](module://mod1)',
        '[Party](party://p1)',
        '[Monster](monster://mo1)',
        '[Encounter](encounter://e1)',
      ].join('\n\n'),
      enableMentionModal: true,
    });

    const links = wrapper.findAll('.internal-link');
    expect(links).toHaveLength(5);
    const expected = ['note', 'module', 'party', 'monster', 'encounter'];
    for (let i = 0; i < links.length; i += 1) {
      await links[i].trigger('click');
      await nextTick();
      expect(modal.currentMentionModal.value?.kind).toBe(expected[i]);
      expect(modal.currentMentionModal.value?.entity).toBeTruthy();
      modal.closeMentionModal(
        modal.currentMentionModal.value?.modalId ?? 'missing',
      );
    }
  });

  it('handles missing kinds, unknown entities and plain links', async () => {
    const modal = useModalState();
    const pushState = vi.spyOn(history, 'pushState');
    const { wrapper } = await mountMarkdown({
      content: 'Body',
      enableMentionModal: true,
    });
    const root = wrapper.find('.markdown-content').element;

    const unknown = document.createElement('a');
    unknown.className = 'internal-link';
    unknown.setAttribute('data-kind', 'unknown');
    unknown.setAttribute('data-id', 'x');
    unknown.href = '/unknown/x';
    root.appendChild(unknown);
    await nextTick();
    unknown.click();
    await nextTick();
    expect(modal.currentMentionModal.value?.entity).toBeNull();
    modal.closeMentionModal(
      modal.currentMentionModal.value?.modalId ?? 'missing',
    );

    const plain = document.createElement('a');
    plain.className = 'internal-link';
    plain.href = '/plain';
    root.appendChild(plain);
    await nextTick();
    plain.click();
    expect(pushState).toHaveBeenCalledWith(history.state, '', '/plain');
  });

  it('falls back to router-based anchor scrolling', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    const { wrapper, router } = await mountMarkdown({
      content: '[Goblin](monster://m1)',
      anchorMap: new Set(['m1']),
    });
    const replace = vi.spyOn(router, 'replace');
    const root = wrapper.find('.markdown-content').element;
    const anchor = document.createElement('div');
    anchor.id = 'm1';
    root.appendChild(anchor);

    await wrapper.find('.internal-link').trigger('click');
    await flushPromises();
    await nextTick();

    expect(replace).toHaveBeenCalledWith({ hash: '#m1' });
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('tracks intersection visibility and ignores non-task change events', async () => {
    let callback: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(function (cb: IntersectionObserverCallback) {
        callback = cb;
        return { observe, disconnect, unobserve: vi.fn() };
      }),
    );

    const { wrapper } = await mountMarkdown({
      content: '- [ ] Task',
      taskCheckboxEnabled: true,
    });

    callback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    callback?.(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    const root = wrapper.find('.markdown-content').element;
    const other = document.createElement('div');
    root.appendChild(other);
    other.dispatchEvent(new Event('change', { bubbles: true }));

    const extra = document.createElement('input');
    extra.type = 'checkbox';
    root.appendChild(extra);
    extra.dispatchEvent(new Event('change', { bubbles: true }));

    window.dispatchEvent(new Event('hashchange'));
    wrapper.unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('bounds the parsed-content cache', async () => {
    const { wrapper } = await mountMarkdown({ content: 'start' });
    for (let i = 0; i < 105; i += 1) {
      await wrapper.setProps({ content: `content ${i}` });
    }
    expect(wrapper.text()).toContain('content 104');
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
