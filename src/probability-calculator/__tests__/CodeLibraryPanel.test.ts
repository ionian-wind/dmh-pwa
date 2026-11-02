import { describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import CodeLibraryPanel from '../CodeLibraryPanel.vue';
import type { CodeLibraryPanelState } from '../codeLibrary';

function makeState(): CodeLibraryPanelState {
  return reactive({
    pieces: [
      {
        id: 'piece-1',
        name: 'Attack',
        code: 'output 1d20',
        include: false,
      },
      {
        id: 'piece-2',
        name: 'Damage',
        code: 'output 2d6',
        include: true,
      },
    ],
    selectedId: 'piece-1' as string | null,
    onLoad: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
  });
}

describe('CodeLibraryPanel', () => {
  it('renders pieces and loads one on click', async () => {
    const state = makeState();
    const wrapper = mount(CodeLibraryPanel, { props: { state } });

    expect(wrapper.text()).toContain('Attack');
    expect(wrapper.text()).toContain('Damage');
    expect(wrapper.find('.is-selected').text()).toContain('Attack');

    await wrapper.findAll('.code-library-item')[0].trigger('click');
    expect(state.onLoad).toHaveBeenCalledWith(state.pieces[0]);
    wrapper.unmount();
  });

  it('toggles inclusion, renames and deletes without loading', async () => {
    const state = makeState();
    const wrapper = mount(CodeLibraryPanel, { props: { state } });

    const first = wrapper.findAll('.code-library-item')[0];
    await first.find('input[type="checkbox"]').setValue(true);
    expect(state.pieces[0].include).toBe(true);
    expect(state.onLoad).not.toHaveBeenCalled();

    await first.find('button[aria-label="Rename"]').trigger('click');
    expect(state.onRename).toHaveBeenCalledWith(state.pieces[0]);
    expect(state.onLoad).not.toHaveBeenCalled();

    await first.find('button[aria-label="Delete"]').trigger('click');
    expect(state.onDelete).toHaveBeenCalledWith(state.pieces[0]);
    wrapper.unmount();
  });

  it('shows the empty state', () => {
    const state = makeState();
    state.pieces = [];
    const wrapper = mount(CodeLibraryPanel, { props: { state } });
    expect(wrapper.text()).toContain('No saved code pieces yet.');
    wrapper.unmount();
  });
});
