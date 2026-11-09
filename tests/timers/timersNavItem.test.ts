import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

import TimersNavItem from '@/features/timers/NavItem.vue';
import { timersOpen } from '@/features/timers/state';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

describe('timers nav item', () => {
  beforeEach(() => {
    resetMockStores();
    timersOpen.value = false;
  });

  it('toggles the timers panel instead of navigating', async () => {
    const wrapper = mount(TimersNavItem);
    await flushPromises();

    await wrapper.find('[data-stub="QItem"]').trigger('click');
    expect(timersOpen.value).toBe(true);

    await wrapper.find('[data-stub="QItem"]').trigger('click');
    expect(timersOpen.value).toBe(false);
    wrapper.unmount();
  });
});
