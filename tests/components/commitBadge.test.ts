import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import CommitBadge from '@/components/CommitBadge.vue';

describe('CommitBadge', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the commit id inlined at build time', () => {
    vi.stubEnv('VITE_COMMIT_SHA', 'abc123');
    const wrapper = mount(CommitBadge);

    expect(wrapper.text()).toBe('abc123');
    expect(wrapper.find('.commit-badge').exists()).toBe(true);
    wrapper.unmount();
  });

  it('falls back to dev when no commit id was provided', () => {
    const wrapper = mount(CommitBadge);

    expect(wrapper.text()).toBe('dev');
    wrapper.unmount();
  });
});
