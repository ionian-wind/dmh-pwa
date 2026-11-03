import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const push = vi.hoisted(() => vi.fn());
const layoutMock = vi.hoisted(() => ({
  setTopMenuContent: vi.fn(),
  setRightDrawer: vi.fn(),
  clearRightDrawer: vi.fn(),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/composables/useLayout', () => ({
  useLayout: () => ({ setTopMenuContent: layoutMock.setTopMenuContent }),
  useRightDrawer: () => ({
    set: layoutMock.setRightDrawer,
    clear: layoutMock.clearRightDrawer,
  }),
}));

import ru from '@/i18n/locales/ru.json';
import ProbabilitySyntaxView from '../ProbabilitySyntaxView.vue';
import TableOfContents from '@/components/common/TableOfContents.vue';

describe('ProbabilitySyntaxView', () => {
  it('has Russian translations for the syntax reference', () => {
    expect(ru.probabilityCalculator.syntaxPage.title).toBe(
      'Справка по синтаксису AnyDice',
    );
    expect(ru.probabilityCalculator.syntaxPage.sections.functions).toBe(
      'Функции',
    );
  });

  it('renders the syntax reference and returns to the calculator', async () => {
    const wrapper = mount(ProbabilitySyntaxView);

    expect(wrapper.text()).toContain('Program basics');
    expect(wrapper.text()).toContain('Numbers, dice and operators');
    expect(wrapper.text()).toContain('Sequences');
    expect(wrapper.text()).toContain('Functions');
    expect(wrapper.text()).toContain('Function library');
    expect(wrapper.text()).toContain('[highest N of DICE]');
    expect(wrapper.text()).toContain('4d6 drop lowest');
    expect(wrapper.text()).toContain('output [highest 3 of 4d6]');
    expect(wrapper.text()).toContain('set "explode depth" to 2');
    expect(wrapper.text()).toContain('d{1,2,4,4}');
    expect(wrapper.text()).toContain('d{}');

    const header = layoutMock.setTopMenuContent.mock.calls[0][0];
    expect(header.props).toMatchObject({
      title: 'AnyDice Syntax Reference',
      subtitle: 'Supported syntax for the dice probability calculator',
    });
    header.props.buttons[0].event();
    expect(push).toHaveBeenCalledWith('/probability-calculator');

    for (const anchor of [
      'basics',
      'operators',
      'sequences',
      'position',
      'flow',
      'functions',
      'library',
      'settings',
      'examples',
    ]) {
      expect(wrapper.find(`#${anchor}`).exists()).toBe(true);
    }

    wrapper.unmount();
    expect(layoutMock.clearRightDrawer).toHaveBeenCalled();
  });

  it('injects the hideable TOC sidebar', () => {
    const wrapper = mount(ProbabilitySyntaxView);
    const drawer = layoutMock.setRightDrawer.mock.calls.at(-1)?.[0];

    expect(drawer.component).toBe(TableOfContents);
    expect(drawer.props.title).toBe('On this page');
    expect(drawer.props.items.map((item: any) => item.anchorId)).toEqual([
      'basics',
      'operators',
      'sequences',
      'position',
      'flow',
      'functions',
      'library',
      'settings',
      'examples',
    ]);
    expect(
      drawer.props.items.find((item: any) => item.anchorId === 'position')
        ?.level,
    ).toBe(3);
    expect(drawer.props.onItemClick).toEqual(expect.any(Function));
    wrapper.unmount();
  });
});
