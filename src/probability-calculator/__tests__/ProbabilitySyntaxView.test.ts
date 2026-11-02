import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const push = vi.hoisted(() => vi.fn());
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

import ru from '@/i18n/locales/ru.json';
import ProbabilitySyntaxView from '../ProbabilitySyntaxView.vue';

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

    expect(wrapper.text()).toContain('AnyDice Syntax Reference');
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

    await wrapper.find('button').trigger('click');
    expect(push).toHaveBeenCalledWith('/probability-calculator');

    wrapper.unmount();
  });
});
