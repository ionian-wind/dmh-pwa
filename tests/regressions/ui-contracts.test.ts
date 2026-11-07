import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createI18n } from 'vue-i18n';

vi.mock('@/utils/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/storage')>();
  return {
    ...actual,
    useMentionsStore: () => ({
      getLinks: () => [{ kind: 'note', id: 'outgoing' }],
      getBacklinks: () => [{ kind: 'note', id: 'incoming' }],
      load: vi.fn(),
    }),
  };
});

vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({
    items: [{ id: 'm1', name: 'Module One' }],
    load: vi.fn(),
  }),
}));

import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue';
import NoteViewSidebar from '@/notes/NoteViewSidebar.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import NumberSpinner from '@/components/common/NumberSpinner.vue';
import PartyCard from '@/parties/PartyCard.vue';
import { createLayoutStore, LayoutKey } from '@/composables/useLayout';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      common: {
        mentions: 'Mentions',
        mentionedIn: 'Mentioned In',
        noModule: 'No Module',
        anyModule: 'Any Module',
        close: 'Close',
        cancel: 'Cancel',
        save: 'Save',
        expand: 'Expand',
        collapse: 'Collapse',
      },
      tags: { title: 'Tags' },
      noteTypeSelector: { selectType: 'Select Type' },
    },
  },
});

const slotStub = (name: string) => ({
  name,
  template: '<div><slot /></div>',
});

const QBtnStub = {
  name: 'QBtn',
  emits: ['click'],
  template:
    '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
};

const QInputStub = {
  name: 'QInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" />',
};

const QSelectStub = {
  name: 'QSelect',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select />',
};

const QDialogStub = {
  name: 'QDialog',
  props: ['modelValue'],
  template: '<div><slot /></div>',
};

const BaseCardStub = {
  name: 'BaseCard',
  props: ['title'],
  template: '<div><h1>{{ title }}</h1><slot /></div>',
};

const quasarStubs = {
  QLayout: slotStub('QLayout'),
  QPageContainer: slotStub('QPageContainer'),
  QPage: slotStub('QPage'),
  QDrawer: slotStub('QDrawer'),
  QDialog: QDialogStub,
  QCard: slotStub('QCard'),
  QCardSection: slotStub('QCardSection'),
  QCardActions: slotStub('QCardActions'),
  QToolbar: slotStub('QToolbar'),
  QScrollArea: slotStub('QScrollArea'),
  QBtn: QBtnStub,
  QInput: QInputStub,
  QSelect: QSelectStub,
  QSeparator: slotStub('QSeparator'),
  QMenu: slotStub('QMenu'),
  QSpace: slotStub('QSpace'),
  QBanner: slotStub('QBanner'),
  QAvatar: slotStub('QAvatar'),
  QToolbarTitle: slotStub('QToolbarTitle'),
  QBtnGroup: slotStub('QBtnGroup'),
  QItem: slotStub('QItem'),
  QItemSection: slotStub('QItemSection'),
  QList: slotStub('QList'),
  QTabs: slotStub('QTabs'),
  QTab: slotStub('QTab'),
  QTabPanels: slotStub('QTabPanels'),
  QTabPanel: slotStub('QTabPanel'),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('regression: UI contracts', () => {
  it('registers the PWA install listeners', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const wrapper = mount(PWAInstallPrompt, {
      global: { stubs: quasarStubs },
    });

    expect(add).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function),
    );
    expect(add).toHaveBeenCalledWith('appinstalled', expect.any(Function));
    wrapper.unmount();
  });

  it('forwards subtitle and sidepanel from BaseEntityView', async () => {
    const layout = createLayoutStore();

    const wrapper = mount(BaseEntityView, {
      props: {
        entity: { id: '1' },
        entityName: 'thing',
        listRoute: '/things',
        title: 'Title',
        subtitle: 'Subtitle',
      },
      slots: { default: 'Body', sidepanel: 'Side panel' },
      global: {
        plugins: [i18n],
        provide: { [LayoutKey]: layout },
        stubs: quasarStubs,
      },
    });
    await nextTick();

    expect(layout.topMenuContent.value?.props?.subtitle).toBe('');
    expect(wrapper.find('.entity-page-subtitle').text()).toBe('Subtitle');
    expect(layout.topMenuContent.value?.props?.showEdit).toBe(true);
    expect(layout.topMenuContent.value?.props?.showDelete).toBe(true);

    await wrapper.setProps({ headerShowEdit: false, headerShowDelete: false });
    await nextTick();
    expect(layout.topMenuContent.value?.props?.showEdit).toBe(false);
    expect(layout.topMenuContent.value?.props?.showDelete).toBe(false);

    await wrapper.setProps({ headerShowEdit: true, headerShowDelete: true });
    await nextTick();
    expect(layout.topMenuContent.value?.props?.showEdit).toBe(true);
    expect(layout.topMenuContent.value?.props?.showDelete).toBe(true);

    expect(layout.rightDrawerContent.value).not.toBeNull();
    wrapper.unmount();
  });

  it('forwards actions, sub, and sidepanel slots through BaseEntityTabView', () => {
    const BaseEntityViewStub = {
      name: 'BaseEntityView',
      template:
        '<div><slot /><slot name="actions" /><slot name="sub" /><slot name="sidepanel" /></div>',
    };

    const wrapper = mount(BaseEntityTabView, {
      props: {
        entity: { id: '1' },
        entityName: 'thing',
        listRoute: '/things',
        tabs: [{ id: 'document', label: 'Document' }],
      },
      slots: {
        document: 'DEFAULT',
        actions: 'ACTIONS',
        sub: 'SUB',
        sidepanel: 'SIDEPANEL',
      },
      global: {
        stubs: { ...quasarStubs, BaseEntityView: BaseEntityViewStub },
      },
    });

    expect(wrapper.text()).toContain('DEFAULT');
    expect(wrapper.text()).toContain('ACTIONS');
    expect(wrapper.text()).toContain('SUB');
    expect(wrapper.text()).toContain('SIDEPANEL');
  });

  it('renders a footer slot and emits update:isOpen from BaseModal', async () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        modalId: 'regression-modal',
        title: 'Modal',
        showCancel: true,
      },
      slots: { default: 'BODY', footer: 'FOOTER' },
      global: { plugins: [i18n], stubs: quasarStubs },
    });
    await nextTick();

    expect(wrapper.text()).toContain('FOOTER');

    await wrapper.find('.btn-close-modal').trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('update:isOpen')?.[0]).toEqual([false]);
    wrapper.unmount();
  });

  it('updates NumberSpinner from typed input', async () => {
    const wrapper = mount(NumberSpinner, {
      props: { modelValue: 5, min: 0, max: 99 },
      global: { stubs: quasarStubs },
    });

    wrapper.findComponent(QInputStub).vm.$emit('update:modelValue', '7');
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([7]);
  });

  it('renders a legacy party without moduleIds', () => {
    expect(() =>
      mount(PartyCard, {
        props: {
          party: {
            id: 'p1',
            name: 'Legacy',
            characters: [],
            createdAt: 0,
            updatedAt: 0,
          } as any,
        },
        global: {
          plugins: [i18n],
          stubs: { ...quasarStubs, BaseCard: BaseCardStub },
        },
      }),
    ).not.toThrow();
  });
});
