import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

import { useJukeboxPlaylistsStore } from '@/jukebox/stores';
import { useMapEntityCatalog } from '@/components/common/entityLinking/useMapEntityCatalog';
import { MAP_ENTITY_KIND_OPTIONS } from '@/components/common/entityLinking/entityRefs';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

const CatalogHarness = defineComponent({
  name: 'CatalogHarness',
  setup() {
    const { groups, getLabel } = useMapEntityCatalog();
    return () =>
      h('div', [
        ...groups.value.flatMap((group) =>
          group.items.map((item) =>
            h('span', { class: 'catalog-item' }, `${group.kind}:${item.label}`),
          ),
        ),
        h(
          'span',
          { class: 'catalog-label' },
          getLabel({ kind: 'playlist', id: 'p1' }),
        ),
      ]);
  },
});

describe('map entity catalog playlists', () => {
  beforeEach(() => {
    resetMockStores();
  });

  it('offers playlists and resolves their labels', () => {
    const playlists = useJukeboxPlaylistsStore();
    playlists.items.value = [
      {
        id: 'p1',
        name: 'Battle music',
        trackIds: [],
        createdAt: 1,
        updatedAt: 1,
      },
    ] as any;

    const option = MAP_ENTITY_KIND_OPTIONS.find(
      (entry) => entry.kind === 'playlist',
    );
    expect(option).toMatchObject({
      kind: 'playlist',
      labelKey: 'playlist.title',
      titleField: 'name',
    });

    const wrapper = mount(CatalogHarness);
    expect(wrapper.text()).toContain('playlist:Battle music');
    expect(wrapper.find('.catalog-label').text()).toBe('Battle music');
    wrapper.unmount();
  });
});
