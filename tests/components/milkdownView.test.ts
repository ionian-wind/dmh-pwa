import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { h, nextTick } from 'vue';

import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';
import { extractHeadingAnchor } from '@/components/common/milkdown/plugins/headingAnchor';
import { useModalState } from '@/composables/useModalState';
import { resetMockStores, seedMockStore } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

vi.mock('@milkdown/vue', () => ({
  MilkdownProvider: {
    name: 'MilkdownProviderStub',
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/components/common/milkdown/MilkdownEditor.vue', () => ({
  default: {
    name: 'MilkdownEditorStub',
    props: [
      'modelValue',
      'readonly',
      'currentEntityType',
      'currentEntityId',
      'tags',
    ],
    template: '<div class="milkdown-editor-stub"></div>',
  },
}));

async function mountView(props: Record<string, any> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => h('div') } },
      { path: '/notes', component: { render: () => h('div') } },
      { path: '/monsters/:id', component: { render: () => h('div') } },
    ],
  });
  await router.push('/');
  await router.isReady();

  const wrapper = mount(MilkdownView, {
    props: { content: '', ...props },
    global: { plugins: [router] },
  });
  await flushPromises();
  return { wrapper, router };
}

function appendElement(
  wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'],
  html: string,
) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const element = container.firstElementChild as HTMLElement;
  wrapper.element.appendChild(element);
  return element;
}

describe('MilkdownView', () => {
  beforeEach(() => {
    resetMockStores();
  });

  it('navigates to the note list when a tag is clicked', async () => {
    const pushState = vi.spyOn(history, 'pushState');
    const { wrapper } = await mountView();
    const tag = appendElement(
      wrapper,
      '<span class="tag-link" data-tag="harbor">#harbor</span>',
    );

    tag.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(pushState).toHaveBeenCalledWith(
      history.state,
      '',
      '/notes?tag=harbor',
    );
    wrapper.unmount();
  });

  it('does not navigate for disabled entity links', async () => {
    const pushState = vi.spyOn(history, 'pushState');
    const { wrapper } = await mountView();
    const disabled = appendElement(
      wrapper,
      '<span class="disabled-internal-link" aria-disabled="true">Map</span>',
    );

    disabled.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(pushState).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('opens a mention modal for enabled entity links', async () => {
    seedMockStore('monsters', [{ id: 'm1', name: 'Goblin' }]);
    const modal = useModalState();
    const { wrapper } = await mountView({ enableMentionModal: true });
    const link = appendElement(
      wrapper,
      '<a class="internal-link monster-link" data-kind="monster" data-id="m1" href="/monsters/m1">Goblin</a>',
    );

    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(modal.currentMentionModal.value).toMatchObject({
      kind: 'monster',
      entity: { id: 'm1' },
    });
    modal.closeMentionModal(
      modal.currentMentionModal.value?.modalId ?? 'missing',
    );
    wrapper.unmount();
  });

  it('toggles the source line for a task item', async () => {
    const content = '- [ ] Task one\n- [x] Task two';
    const { wrapper } = await mountView({
      content,
      taskCheckboxEnabled: true,
    });
    const list = appendElement(
      wrapper,
      [
        '<ul>',
        '<li class="list-item"><div class="label-wrapper"><span class="milkdown-icon label unchecked"></span></div><div class="children">Task one</div></li>',
        '<li class="list-item"><div class="label-wrapper"><span class="milkdown-icon label checked"></span></div><div class="children">Task two</div></li>',
        '</ul>',
      ].join(''),
    );
    const firstLabel = list.querySelectorAll(
      '.label-wrapper',
    )[0] as HTMLElement;

    firstLabel.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );

    expect(wrapper.emitted('update:content')?.[0]).toEqual([
      '- [x] Task one\n- [x] Task two',
    ]);
    wrapper.unmount();
  });

  it('extracts and removes a heading anchor marker', () => {
    const heading = {
      type: 'heading',
      children: [{ type: 'text', value: 'Title {#note-abc}' }],
    };

    expect(extractHeadingAnchor(heading)).toEqual({
      kind: 'note',
      id: 'abc',
    });
    expect(heading.children[0].value).toBe('Title');

    const disabled = {
      type: 'heading',
      children: [{ type: 'text', value: 'Title {#map-abc}' }],
    };
    expect(extractHeadingAnchor(disabled)).toBeNull();
    expect(disabled.children[0].value).toBe('Title {#map-abc}');
  });
});
