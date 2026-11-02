import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const push = vi.hoisted(() => vi.fn());
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

import ProbabilitySyntaxView from '../ProbabilitySyntaxView.vue';

describe('ProbabilitySyntaxView', () => {
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
    expect(wrapper.text()).toContain('set "explode depth" to 2');

    await wrapper.find('button').trigger('click');
    expect(push).toHaveBeenCalledWith('/probability-calculator');

    wrapper.unmount();
  });
});
