import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';

import BaseCard from '@/components/common/BaseCard.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import NumberSpinner from '@/components/common/NumberSpinner.vue';
import TagSelector from '@/components/common/TagSelector.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue';
import CharacterCard from '@/characters/CharacterCard.vue';
import NoteCard from '@/notes/NoteCard.vue';
import PartyCard from '@/parties/PartyCard.vue';
import MonsterCard from '@/monsters/MonsterCard.vue';
import ModuleCard from '@/modules/ModuleCard.vue';
import EncounterCard from '@/encounters/EncounterCard.vue';
import CharacterEditor from '@/characters/CharacterEditor.vue';
import ModuleEditor from '@/modules/ModuleEditor.vue';
import BaseListView from '@/components/common/BaseListView.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import NoteTypeSelector from '@/notes/NoteTypeSelector.vue';
import IconPicker from '@/components/common/IconPicker.vue';
import ColorPicker from '@/components/common/ColorPicker.vue';
import { MAP_MARKER_ICONS } from '@/maps/icons';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useConfigStore } from '@/utils/configStore';
import { quasarStubs } from '../helpers/quasar-stubs';

const QInput = quasarStubs.QInput;

describe('current shared components', () => {
  it('BaseCard renders content and emits actions', async () => {
    const wrapper = mount(BaseCard, {
      props: {
        title: 'Card',
        showView: true,
        showEdit: true,
        showDelete: true,
        showCopy: true,
      },
      slots: { default: 'Body' },
    });

    expect(wrapper.text()).toContain('Card');
    expect(wrapper.text()).toContain('Body');

    const buttons = wrapper.findAll('button');
    for (const button of buttons) await button.trigger('click');

    expect(wrapper.emitted('view')).toBeTruthy();
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('copy')).toBeTruthy();
  });

  it('BaseCard can hide empty content', () => {
    const wrapper = mount(BaseCard, {
      slots: { default: '<!-- empty -->' },
    });
    expect(wrapper.text()).not.toContain('empty');
  });

  it('BaseModal renders body/footer and emits close events', async () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        modalId: 'component-modal',
        title: 'Modal',
        showCancel: true,
      },
      slots: { default: 'BODY', footer: 'FOOTER' },
    });
    await nextTick();

    expect(wrapper.text()).toContain('BODY');
    expect(wrapper.text()).toContain('FOOTER');

    await wrapper.find('.btn-close-modal').trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('update:isOpen')?.[0]).toEqual([false]);
    wrapper.unmount();
  });

  it('BaseModal can hide the close button', async () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        modalId: 'no-close-modal',
        title: 'Modal',
        showClose: false,
      },
    });
    await nextTick();
    expect(wrapper.find('.btn-close-modal').exists()).toBe(false);
    wrapper.unmount();
  });

  it('BaseModal renders the standard delete action', async () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        modalId: 'delete-modal',
        title: 'Modal',
        showDelete: true,
        showCancel: true,
        showSubmit: true,
      },
    });
    await nextTick();

    const deleteButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Delete');
    expect(deleteButton).toBeTruthy();
    await deleteButton!.trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);
    wrapper.unmount();
  });

  it('BaseModal renders header tabs with icons and switches tab content', async () => {
    const TabIcon = defineComponent({
      name: 'TabIcon',
      setup() {
        return () => h('span', { class: 'tab-icon' });
      },
    });
    const QTabsStub = defineComponent({
      name: 'QTabs',
      props: { modelValue: String },
      emits: ['update:modelValue'],
      setup(_, { slots, emit }) {
        return () =>
          h('div', { class: 'tabs-stub' }, [
            h(
              'button',
              {
                class: 'switch-tab',
                onClick: () => emit('update:modelValue', 'links'),
              },
              'switch',
            ),
            slots.default?.(),
          ]);
      },
    });
    const QTabPanelsStub = defineComponent({
      name: 'QTabPanels',
      props: { modelValue: String },
      setup(props, { slots }) {
        return () =>
          h(
            'div',
            { class: 'panels-stub', 'data-active': props.modelValue },
            slots.default?.(),
          );
      },
    });
    const QTabPanelStub = defineComponent({
      name: 'QTabPanel',
      props: { name: String },
      setup(props, { slots }) {
        return () =>
          h(
            'div',
            { class: 'panel-stub', 'data-name': props.name },
            slots.default?.(),
          );
      },
    });

    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        modalId: 'tabs-modal',
        title: 'Dialog title',
        tabs: [
          { name: 'main', title: 'Main editor', icon: TabIcon },
          { name: 'links', title: 'Links', icon: TabIcon },
        ],
      },
      slots: {
        main: 'MAIN CONTENT',
        links: 'LINKS CONTENT',
      },
      global: {
        stubs: {
          QTabs: QTabsStub,
          QTabPanels: QTabPanelsStub,
          QTabPanel: QTabPanelStub,
        },
      },
    });
    await nextTick();

    expect(wrapper.findAll('[data-stub="QTab"]')).toHaveLength(2);
    expect(wrapper.findAll('.tab-icon')).toHaveLength(2);
    expect(wrapper.text()).not.toContain('Dialog title');
    expect(wrapper.text()).toContain('MAIN CONTENT');
    expect(wrapper.text()).toContain('LINKS CONTENT');
    expect(wrapper.findComponent(QTabPanelsStub).props('modelValue')).toBe(
      'main',
    );

    await wrapper.find('.switch-tab').trigger('click');
    await nextTick();

    expect(wrapper.emitted('update:activeTab')?.[0]).toEqual(['links']);
    expect(wrapper.findComponent(QTabPanelsStub).props('modelValue')).toBe(
      'links',
    );
    wrapper.unmount();
  });

  it('LanguageSwitcher normalizes and persists supported locales', async () => {
    const config = useConfigStore();
    config.savedLanguage = 'en';
    const wrapper = mount(LanguageSwitcher);

    const select = wrapper.findComponent(quasarStubs.QSelect);
    expect(select.props('modelValue')).toBe('en');

    select.vm.$emit('update:modelValue', 'ru');
    await nextTick();
    expect(config.savedLanguage).toBe('ru');

    select.vm.$emit('update:modelValue', 'en');
    await nextTick();
    expect(config.savedLanguage).toBe('en');
    wrapper.unmount();
  });

  it('JukeboxPlayer centers playback controls and exposes the volume level', () => {
    const wrapper = mount(JukeboxPlayer);

    const controls = wrapper.find('.player-controls');
    expect(controls.exists()).toBe(true);
    expect(controls.find('.playback-options').exists()).toBe(true);
    expect(controls.find('.playback-controls').exists()).toBe(true);
    expect(controls.find('.volume-control').exists()).toBe(true);
    expect(wrapper.find('.volume-popup-value').text()).toBe('100%');
  });

  it('JukeboxPlayer shows an animated gradient from album colors while playing', () => {
    const player = useJukeboxPlayerStore();
    player.isPlaying = true;
    player.currentTrack = {
      id: 'track-1',
      title: 'Track',
      palette: ['#112233', '#445566'],
      color: '#112233',
    } as any;

    const wrapper = mount(JukeboxPlayer, {
      props: { animatedBackground: true },
    });

    expect(wrapper.classes()).toContain('animated-gradient-surface');
    expect(wrapper.classes()).toContain('has-gradient-bg');
    expect(wrapper.classes()).toContain('with-animated-bg');
    expect(
      wrapper.find('.animated-gradient-layer').attributes('style'),
    ).toContain('--custom-gradient');
    expect(wrapper.attributes('style')).toContain(
      '--jp-control-color: #ffffff',
    );

    player.isPlaying = false;
    player.currentTrack = null;
  });

  it('JukeboxPlayer leaves gradient animation to its parent when embedded', () => {
    const player = useJukeboxPlayerStore();
    player.isPlaying = true;
    player.currentTrack = {
      id: 'track-2',
      title: 'Track',
      palette: ['#d94f8a', '#4f46e5', '#22c55e', '#f59e0b'],
      color: '#d94f8a',
    } as any;

    const wrapper = mount(JukeboxPlayer, {
      props: { animatedBackground: false },
    });

    expect(wrapper.classes()).toContain('animated-gradient-surface');
    expect(wrapper.classes()).not.toContain('has-gradient-bg');
    expect(wrapper.classes()).not.toContain('with-animated-bg');
    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(false);
    expect(wrapper.attributes('style') ?? '').not.toContain(
      '--jp-control-color',
    );

    player.isPlaying = false;
    player.currentTrack = null;
  });

  it('JukeboxPlayer keeps a static gradient from album colours while paused', () => {
    const player = useJukeboxPlayerStore();
    player.isPlaying = false;
    player.currentTrack = {
      id: 'track-3',
      title: 'Track',
      palette: ['#101020', '#22223a'],
      color: '#101020',
    } as any;

    const wrapper = mount(JukeboxPlayer, {
      props: { animatedBackground: true },
    });

    expect(wrapper.classes()).toContain('has-gradient-bg');
    expect(wrapper.classes()).not.toContain('with-animated-bg');
    expect(wrapper.attributes('style')).toContain('--jp-control-color');
    expect(
      wrapper.find('.animated-gradient-layer').attributes('style'),
    ).toContain('--custom-gradient');

    player.currentTrack = null;
  });

  it('JukeboxPlayer keeps the same gradient layer across pause and resume', async () => {
    const player = useJukeboxPlayerStore();
    player.isPlaying = true;
    player.currentTrack = {
      id: 'track-pause',
      title: 'Track',
      palette: ['#101020', '#22223a'],
      color: '#101020',
    } as any;

    const wrapper = mount(JukeboxPlayer, {
      props: { animatedBackground: true },
    });
    const layer = wrapper.find('.animated-gradient-layer').element;

    player.isPlaying = false;
    await nextTick();
    expect(wrapper.classes()).not.toContain('with-animated-bg');
    expect(wrapper.find('.animated-gradient-layer').element).toBe(layer);

    player.isPlaying = true;
    await nextTick();
    expect(wrapper.classes()).toContain('with-animated-bg');
    expect(wrapper.find('.animated-gradient-layer').element).toBe(layer);

    player.isPlaying = false;
    player.currentTrack = null;
  });

  it('JukeboxPlayer fades the gradient out when the next track has no palette', async () => {
    const player = useJukeboxPlayerStore();
    player.isPlaying = true;
    player.currentTrack = {
      id: 'track-with-palette',
      title: 'Track',
      palette: ['#101020', '#22223a'],
      color: '#101020',
    } as any;

    const wrapper = mount(JukeboxPlayer, {
      props: { animatedBackground: true },
    });
    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(true);

    player.currentTrack = {
      id: 'track-without-palette',
      title: 'Next track',
    } as any;
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await nextTick();

    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain('has-gradient-bg');

    player.isPlaying = false;
    player.currentTrack = null;
  });

  it('JukeboxPlayer removes the gradient when the setting is off', () => {
    const config = useConfigStore();
    const player = useJukeboxPlayerStore();
    config.jukeboxAnimatePlayerBackground = false;
    player.isPlaying = true;
    player.currentTrack = {
      id: 'track-4',
      title: 'Track',
      palette: ['#101020', '#22223a'],
      color: '#101020',
    } as any;

    const wrapper = mount(JukeboxPlayer, {
      props: { animatedBackground: true },
    });

    expect(wrapper.classes()).not.toContain('has-gradient-bg');
    expect(wrapper.classes()).not.toContain('with-animated-bg');
    expect(wrapper.find('.animated-gradient-layer').exists()).toBe(false);

    config.jukeboxAnimatePlayerBackground = true;
    player.currentTrack = null;
  });

  it('JukeboxPlayer exposes persisted player settings', async () => {
    const config = useConfigStore();
    const player = useJukeboxPlayerStore();
    player.isPlaying = true;
    player.currentTrack = {
      id: 'track-settings',
      title: 'Track',
      palette: ['#112233', '#445566'],
      color: '#112233',
    } as any;

    const wrapper = mount(JukeboxPlayer, {
      props: { animatedBackground: true },
    });

    const toggles = wrapper.findAllComponents(quasarStubs.QToggle);
    expect(toggles).toHaveLength(2);
    expect(toggles[0].props('modelValue')).toBe(false);
    expect(toggles[1].props('modelValue')).toBe(true);
    expect(wrapper.classes()).toContain('with-animated-bg');

    await toggles[0].vm.$emit('update:modelValue', true);
    await toggles[1].vm.$emit('update:modelValue', false);
    await nextTick();

    expect(config.jukeboxSmoothTrackChange).toBe(true);
    expect(config.jukeboxAnimatePlayerBackground).toBe(false);
    expect(wrapper.classes()).not.toContain('with-animated-bg');

    player.isPlaying = false;
    player.currentTrack = null;
  });

  it('JukeboxPlayer wires transport, volume and progress controls', async () => {
    const player = useJukeboxPlayerStore();
    player.currentTrack = {
      id: 'track-controls',
      title: 'Track',
      duration: 120,
    } as any;
    player.duration = 120;
    player.currentTime = 30;
    player.volume = 0.5;
    player.isPlaying = true;
    player.queue = [
      player.currentTrack,
      { id: 'track-next', title: 'Next', duration: 60 } as any,
    ];
    player.queueIndex = 0;

    const seek = vi.spyOn(player, 'seek').mockImplementation(() => {});
    const setVolume = vi
      .spyOn(player, 'setVolume')
      .mockImplementation(() => {});
    const togglePlay = vi
      .spyOn(player, 'togglePlay')
      .mockImplementation(() => {});
    const playNext = vi.spyOn(player, 'playNext').mockImplementation(() => {});
    const playPrev = vi.spyOn(player, 'playPrev').mockImplementation(() => {});
    const toggleShuffle = vi
      .spyOn(player, 'toggleShuffle')
      .mockImplementation(() => {});
    const cycleRepeat = vi
      .spyOn(player, 'cycleRepeatMode')
      .mockImplementation(() => {});
    const toggleMute = vi
      .spyOn(player, 'toggleMute')
      .mockImplementation(() => {});

    const wrapper = mount(JukeboxPlayer, {
      props: { animatedBackground: false },
    });
    await nextTick();

    await wrapper.find('.time-current').trigger('click');
    expect(wrapper.find('.time-current').text()).toContain('-');

    const seekArea = wrapper.find('.progress-bar-seek');
    await seekArea.trigger('mouseenter');
    await seekArea.trigger('mouseleave');

    const sliders = wrapper.findAllComponents(quasarStubs.QSlider);
    expect(sliders.length).toBeGreaterThanOrEqual(2);
    sliders[0].vm.$emit('update:modelValue', 0.5);
    sliders[0].vm.$emit('update:modelValue', null);
    expect(seek).toHaveBeenCalledWith(60);

    await wrapper.find('.play-pause').trigger('click');
    await wrapper.find('.prev-track').trigger('click');
    await wrapper.find('.next-track').trigger('click');
    expect(togglePlay).toHaveBeenCalled();
    expect(playPrev).toHaveBeenCalled();
    expect(playNext).toHaveBeenCalled();

    const optionButtons = wrapper.findAll('.playback-options button');
    await optionButtons[0].trigger('click');
    await optionButtons[1].trigger('click');
    expect(toggleShuffle).toHaveBeenCalled();
    expect(cycleRepeat).toHaveBeenCalled();

    const volumeButton = wrapper.find('.volume-button');
    await volumeButton.trigger('mouseenter');
    await volumeButton.trigger('wheel', { deltaY: 100 });
    await volumeButton.trigger('mouseleave');
    await volumeButton.trigger('click');
    expect(setVolume).toHaveBeenCalled();
    expect(toggleMute).toHaveBeenCalled();

    await wrapper.find('.volume-popup').trigger('pointerdown');
    await wrapper.find('.volume-popup').trigger('mouseenter');
    await wrapper.find('.volume-popup').trigger('mouseleave');
    await wrapper.find('.volume-popup').trigger('wheel', { deltaY: -100 });
    expect(setVolume).toHaveBeenCalledWith(expect.any(Number));

    sliders[1].vm.$emit('update:modelValue', 0.25);
    sliders[1].vm.$emit('update:modelValue', null);
    expect(setVolume).toHaveBeenCalledWith(0.25);

    player.isPlaying = false;
    player.currentTrack = null;
    player.currentTime = 0;
    wrapper.unmount();
  });

  it('BaseListView grid uses column gutters and three large columns', () => {
    const DummyCard = {
      name: 'DummyCard',
      props: ['item'],
      template: '<div>{{ item.id }}</div>',
    };
    const wrapper = mount(BaseListView, {
      props: {
        items: [{ id: 'a' }],
        cardComponent: DummyCard,
        emptyMessage: '',
        createTitle: '',
        viewStyle: 'grid',
        hideHeader: true,
        cardProps: (item: any) => ({ item }),
      },
    });

    expect(wrapper.find('.q-col-gutter-md').exists()).toBe(true);
    expect(wrapper.find('.col-12.col-sm-6.col-md-4.col-lg-4').exists()).toBe(
      true,
    );
  });

  it('BaseListView forwards editor delete to the parent', async () => {
    const DummyCard = defineComponent({
      name: 'DummyCard',
      props: { item: Object },
      emits: ['edit'],
      setup(_, { emit }) {
        return () =>
          h(
            'button',
            { class: 'edit-card', onClick: () => emit('edit') },
            'Edit',
          );
      },
    });
    const DummyEditor = defineComponent({
      name: 'DummyEditor',
      props: { item: Object },
      emits: ['delete'],
      setup(_, { emit }) {
        return () =>
          h(
            'button',
            { class: 'editor-delete', onClick: () => emit('delete') },
            'Delete',
          );
      },
    });
    const wrapper = mount(BaseListView, {
      props: {
        items: [{ id: 'a' }],
        cardComponent: DummyCard,
        editorComponent: DummyEditor,
        editorProps: (item: any) => ({ item }),
        emptyMessage: '',
        createTitle: '',
        hideHeader: true,
      },
      global: { stubs: { ViewHeader: true } },
    });

    await wrapper.find('.edit-card').trigger('click');
    expect(wrapper.find('.editor-delete').exists()).toBe(true);

    await wrapper.find('.editor-delete').trigger('click');
    expect(wrapper.emitted('delete')?.[0]).toEqual([{ id: 'a' }]);
    expect(wrapper.find('.editor-delete').exists()).toBe(false);
  });

  it('NumberSpinner accepts typed values and clamps them', async () => {
    const wrapper = mount(NumberSpinner, {
      props: { modelValue: 5, min: 0, max: 9 },
    });

    wrapper.findComponent(QInput).vm.$emit('update:modelValue', '12');
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([9]);

    wrapper.findComponent(QInput).vm.$emit('update:modelValue', '-1');
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([0]);
  });

  it('ToggleSwitch emits without mutating its prop', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false, label: 'common.save' },
    });
    expect(wrapper.props('modelValue')).toBe(false);

    wrapper.find('input').setValue(true);
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
    expect(wrapper.props('modelValue')).toBe(false);
  });

  it('ToggleSwitch translates known keys and keeps dynamic names', () => {
    const translated = mount(ToggleSwitch, {
      props: { modelValue: false, label: 'common.save' },
    });
    expect(translated.text()).toContain('Save');

    const dynamic = mount(ToggleSwitch, {
      props: { modelValue: false, label: 'Road trip' },
    });
    expect(dynamic.text()).toContain('Road trip');
  });

  it('TagSelector adds and removes tags', async () => {
    const wrapper = mount(TagSelector, {
      props: { modelValue: ['one'] },
    });

    const input = wrapper.find('input');
    await input.setValue('two');
    await wrapper.find('input').trigger('keydown.enter');

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual([
      'one',
      'two',
    ]);

    const remove = wrapper.find('svg');
    await remove.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual([]);
  });

  it('PWAInstallPrompt registers install listeners', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const wrapper = mount(PWAInstallPrompt);
    expect(add).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function),
    );
    expect(add).toHaveBeenCalledWith('appinstalled', expect.any(Function));
    wrapper.unmount();
  });
});

describe('current domain cards', () => {
  it('renders a character card and supports actions', () => {
    const wrapper = mount(CharacterCard, {
      props: {
        character: { id: 'c1', name: 'Alice', notes: '' },
      },
    });
    expect(wrapper.text()).toContain('Alice');
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('renders a note card and emits tag clicks', async () => {
    const wrapper = mount(NoteCard, {
      props: {
        note: {
          id: 'n1',
          title: 'Session',
          content: 'Hello **world**',
          tags: ['session'],
          typeId: null,
          moduleId: null,
          hidden: false,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    });

    expect(wrapper.text()).toContain('Session');
    expect(wrapper.text()).toContain('world');

    const tag = wrapper.find('.tag');
    await tag.trigger('click');
    expect(wrapper.emitted('tag-click')?.[0]).toEqual(['session']);
  });

  it('renders a legacy party without moduleIds', () => {
    const wrapper = mount(PartyCard, {
      props: {
        party: { id: 'p1', name: 'Legacy', characters: [] } as any,
      },
    });
    expect(wrapper.text()).toContain('Legacy');
  });

  it('renders a monster card with actions', () => {
    const wrapper = mount(MonsterCard, {
      props: { monster: { id: 'm1', name: 'Goblin' }, showActions: true },
    });
    expect(wrapper.text()).toContain('Goblin');
    expect(wrapper.findAll('button').length).toBeGreaterThan(0);
  });

  it('renders module and encounter cards', () => {
    const module = mount(ModuleCard, {
      props: {
        module: { id: 'mod', name: 'Module', description: 'Desc' },
      },
    });
    expect(module.text()).toContain('Module');
    expect(module.text()).toContain('Desc');

    const encounter = mount(EncounterCard, {
      props: {
        encounter: {
          id: 'e1',
          name: 'Ambush',
          description: 'Goblins',
          monsters: { m1: 2, m2: 1 },
          moduleId: 'mod',
        },
      },
    });
    expect(encounter.text()).toContain('Ambush');
    expect(encounter.text()).toContain('2 (3)');
  });
});

describe('current editors', () => {
  it('CharacterEditor submits a name and notes', async () => {
    const wrapper = mount(CharacterEditor, {
      props: { isOpen: true, character: null },
    });

    const inputs = wrapper.findAllComponents(QInput);
    inputs[0].vm.$emit('update:modelValue', 'Alice');
    inputs[1].vm.$emit('update:modelValue', 'Notes');
    await nextTick();

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Alice',
      notes: 'Notes',
    });
  });

  it('CharacterEditor exposes delete for an existing character', async () => {
    const character = {
      id: 'c1',
      name: 'Alice',
      notes: '',
      createdAt: 1,
      updatedAt: 1,
    };
    const wrapper = mount(CharacterEditor, {
      props: { isOpen: true, character },
    });

    expect(wrapper.findComponent(BaseModal).props('showDelete')).toBe(true);
    wrapper.findComponent(BaseModal).vm.$emit('delete');
    expect(wrapper.emitted('delete')?.[0]).toEqual(['c1']);
  });

  it('CharacterEditor refuses to submit without a name', async () => {
    const wrapper = mount(CharacterEditor, {
      props: { isOpen: true, character: null },
    });
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('NoteTypeSelector uses the shared color and icon pickers', () => {
    const wrapper = mount(NoteTypeSelector, {
      props: { modelValue: null, allowCreate: true },
    });

    const color = wrapper.findComponent(ColorPicker);
    const icon = wrapper.findComponent(IconPicker);
    expect(color.exists()).toBe(true);
    expect(color.props('label')).toBe('Color');
    expect(icon.exists()).toBe(true);
    expect(icon.props('collection')).toBe('ra');
    expect(icon.props('icons')).toBe(MAP_MARKER_ICONS);
  });

  it('ColorPicker syncs the color and clears it', async () => {
    const wrapper = mount(ColorPicker, {
      props: {
        modelValue: '#123456',
        label: 'Color',
        clearable: true,
        clearLabel: 'Clear color',
      },
    });

    expect(wrapper.text()).toContain('Color');
    wrapper
      .findComponent(quasarStubs.QColor)
      .vm.$emit('update:modelValue', '#abcdef');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['#abcdef']);

    const clear = wrapper.find('button[title="Clear color"]');
    expect(clear.exists()).toBe(true);
    await clear.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['']);
    wrapper.unmount();
  });

  it('ColorPicker emits an empty value when its model is cleared', () => {
    const wrapper = mount(ColorPicker, {
      props: { modelValue: undefined },
    });
    wrapper
      .findComponent(quasarStubs.QColor)
      .vm.$emit('update:modelValue', null);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
    wrapper.unmount();
  });

  it('ModuleEditor submits name and description', async () => {
    const wrapper = mount(ModuleEditor, {
      props: { isOpen: true, module: null },
    });
    const inputs = wrapper.findAllComponents(QInput);
    inputs[0].vm.$emit('update:modelValue', 'Curse of Strahd');
    await nextTick();

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Curse of Strahd',
    });
  });
});
