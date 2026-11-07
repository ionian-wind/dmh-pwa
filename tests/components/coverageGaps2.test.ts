import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import ImportValidationModal from '@/components/ImportValidationModal.vue';
import Mentions from '@/components/common/Mentions.vue';
import TagChip from '@/components/common/TagChip.vue';
import PopoverPanel from '@/components/common/PopoverPanel.vue';
import TableOfContents from '@/components/common/TableOfContents.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import AmbientControls from '@/ambient-sound/components/AmbientControls.vue';
import MoodProgress from '@/ambient-sound/components/MoodProgress.vue';
import AmbientVolumeDialog from '@/ambient-sound/components/AmbientVolumeDialog.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const stores = vi.hoisted(() => ({
  notes: {
    items: [],
    load: vi.fn(),
    getById: vi.fn((id: string) =>
      id === 'n1' ? { id, title: 'Note one' } : undefined,
    ),
  },
  parties: {
    items: [{ id: 'p1', name: 'Party one' }],
    load: vi.fn(),
  },
  monsters: {
    items: [{ id: 'mo1', name: 'Monster one' }],
    load: vi.fn(),
  },
  encounters: {
    items: [{ id: 'e1', name: 'Encounter one' }],
    load: vi.fn(),
  },
  characters: {
    items: [{ id: 'c1', name: 'Character one' }],
    load: vi.fn(),
  },
  locations: {
    items: [{ id: 'l1', name: 'Location one' }],
    load: vi.fn(),
  },
  ambient: {
    intensity: 50,
    isPlaying: true,
    masterVolume: 80,
    moodVolume: 60,
    ambienceVolume: 40,
    oneShotVolume: 20,
    setIntensity: vi.fn(),
    musicProgress: vi.fn(() => 0.5),
    setMasterVolume: vi.fn(),
    setMoodVolume: vi.fn(),
    setAmbienceVolume: vi.fn(),
    setOneShotVolume: vi.fn(),
  },
}));

vi.mock('@/stores/notes', () => ({ useNoteStore: () => stores.notes }));
vi.mock('@/stores/parties', () => ({ usePartyStore: () => stores.parties }));
vi.mock('@/stores/monsters', () => ({
  useMonsterStore: () => stores.monsters,
}));
vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => stores.encounters,
}));
vi.mock('@/stores/characters', () => ({
  useCharacterStore: () => stores.characters,
}));
vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => stores.locations,
}));
vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => stores.ambient,
}));

const RouterLinkStub = {
  props: ['to'],
  template: '<a class="router-link" :data-to="JSON.stringify(to)"><slot /></a>',
};

describe('coverage gaps: shared components', () => {
  it('renders mention groups, routes and empty state', async () => {
    const wrapper = mount(Mentions, {
      props: {
        title: 'Mentions',
        entities: [
          { kind: 'note', id: 'n1' },
          { kind: 'party', id: 'p1' },
          { kind: 'monster', id: 'mo1' },
          { kind: 'encounter', id: 'e1' },
          { kind: 'character', id: 'c1' },
          { kind: 'location', id: 'l1' },
          { kind: 'other', id: 'o1' },
        ],
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    expect(wrapper.text()).toContain('Note one');
    expect(wrapper.text()).toContain('Parties');
    expect(wrapper.text()).toContain('o1');
    expect(wrapper.findAll('.router-link')).toHaveLength(7);
    wrapper.unmount();

    const empty = mount(Mentions, {
      props: { title: 'Mentions', entities: [] },
    });
    expect(empty.text()).toContain('No mentions');
    empty.unmount();
  });

  it('removes tags and controls the popover', async () => {
    const tag = mount(TagChip, {
      props: { removable: true },
      slots: { default: 'tag' },
    });
    await tag.find('.remove-tag').trigger('click');
    expect(tag.emitted('remove')).toHaveLength(1);
    tag.unmount();

    const popover = mount(PopoverPanel, {
      props: { isOpen: false, offset: [1, 2] },
      slots: { trigger: 'Trigger', default: 'Content' },
    });
    const vm = popover.vm as any;
    vm.open();
    await nextTick();
    vm.close();
    await nextTick();
    vm.toggle();
    await nextTick();
    expect(popover.emitted('open')).toBeTruthy();
    expect(popover.emitted('close')).toBeTruthy();
    await popover.setProps({ isOpen: true });
    expect(popover.emitted('open')).toBeTruthy();
    const menu = popover.findComponent({ name: 'QMenu' });
    menu.vm.$emit('show');
    menu.vm.$emit('hide');
    await nextTick();
    expect(popover.emitted('open')).toBeTruthy();
    expect(popover.emitted('close')).toBeTruthy();
    popover.unmount();
  });

  it('renders a table of contents and handles clicks', async () => {
    const replaceState = vi
      .spyOn(window.history, 'replaceState')
      .mockImplementation(() => undefined);
    const wrapper = mount(TableOfContents, {
      props: {
        items: [
          { id: '1', level: 2, anchorId: 'one', title: 'One' },
          { id: '2', level: 3, anchorId: 'two', title: 'Two' },
        ],
        activeAnchorId: 'one',
      },
    });
    expect(wrapper.findAll('.toc-item')).toHaveLength(2);
    expect(wrapper.find('.toc-item').classes()).toContain('active');
    await wrapper
      .find('.toc-link')
      .trigger('click', { preventDefault: vi.fn() });
    expect(wrapper.emitted('item-click')?.[0]).toEqual(['one']);
    expect(replaceState).toHaveBeenCalled();
    await wrapper.setProps({ activeAnchorId: 'two' });
    expect(wrapper.findAll('.toc-item')[1].classes()).toContain('active');
    replaceState.mockRestore();
    wrapper.unmount();
  });

  it('expands and switches BaseModal tabs', async () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        modalId: 'tabs',
        title: 'Tabs',
        showExpand: true,
        tabs: [
          { name: 'main', title: 'Main' },
          { name: 'links', title: 'Links' },
        ],
        activeTab: 'main',
      },
      slots: { main: 'MAIN', links: 'LINKS' },
    });
    await nextTick();
    const expand = wrapper.find('button[title="Expand"]');
    await expand.trigger('click');
    expect(wrapper.emitted('update:isExpanded')?.[0]).toEqual([true]);
    expect(wrapper.classes()).toBeDefined();
    wrapper.unmount();
  });

  it('syncs modal tabs, expansion and submit state', async () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        modalId: 'sync',
        title: 'Sync',
        isExpanded: false,
        activeTab: 'main',
        tabs: [
          { name: 'main', title: 'Main' },
          { name: 'links', title: 'Links' },
        ],
      },
      slots: { main: 'MAIN', links: 'LINKS' },
    });
    await wrapper.setProps({ activeTab: 'links' });
    await nextTick();
    await wrapper.setProps({
      tabs: [{ name: 'main', title: 'Main' }],
    });
    await nextTick();
    await wrapper.setProps({ isExpanded: true });
    await nextTick();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toHaveLength(1);
    wrapper
      .findComponent({ name: 'QDialog' })
      .vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('cancel')).toBeTruthy();
    wrapper
      .findComponent({ name: 'QTabPanels' })
      .vm.$emit('update:modelValue', 'main');
    await nextTick();
    wrapper.unmount();
  });

  it('updates ambient controls and volume rows', async () => {
    const controls = mount(AmbientControls, { props: { disabled: false } });
    const slider = controls.findComponent(quasarStubs.QSlider);
    await slider.trigger('mouseenter');
    expect(slider.attributes('color')).toBe('info');
    await slider.trigger('mouseleave');
    slider.vm.$emit('update:modelValue', 0.75);
    expect(stores.ambient.setIntensity).toHaveBeenCalledWith(75);
    controls.unmount();

    const volume = mount(AmbientVolumeDialog, {
      props: { modelValue: true },
    });
    expect(volume.text()).toContain('Master volume');
    const rows = volume.findAll('.volume-row');
    expect(rows).toHaveLength(4);
    await rows[0].trigger('wheel', { deltaY: -1 });
    await rows[0].trigger('wheel', { deltaY: 1 });
    await rows[0].trigger('wheel', { deltaY: 0 });
    expect(stores.ambient.setMasterVolume).toHaveBeenCalledTimes(2);
    const sliders = volume.findAllComponents(quasarStubs.QSlider);
    sliders[0].vm.$emit('update:modelValue', 0.5);
    expect(stores.ambient.setMasterVolume).toHaveBeenCalledWith(50);
    await volume.find('button[aria-label="Close"]').trigger('click');
    expect(volume.emitted('update:modelValue')?.[0]).toEqual([false]);
    volume.unmount();

    vi.useFakeTimers();
    const mood = mount(MoodProgress, {
      props: { label: 'Mood', active: true },
    });
    vi.advanceTimersByTime(200);
    expect(mood.text()).toContain('Mood');
    await mood.setProps({ active: false });
    await nextTick();
    mood.unmount();
    vi.useRealTimers();

    const idle = mount(MoodProgress, {
      props: { label: 'Idle', active: false },
    });
    idle.unmount();
  });
});
