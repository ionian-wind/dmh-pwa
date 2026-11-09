import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import DraggablePanel from '@/components/common/DraggablePanel.vue';

async function mountPanel() {
  document
    .querySelectorAll('.floating-panel-anchor')
    .forEach((element) => element.remove());
  const wrapper = mount(DraggablePanel, {
    attachTo: document.body,
    props: { modelValue: true, minWidth: '200px' },
    slots: {
      header: '<div class="test-header">Header</div>',
      default: '<div class="test-body">Body</div>',
    },
  });
  await nextTick();
  await nextTick();
  return wrapper;
}

describe('DraggablePanel', () => {
  it('positions itself above app content but below dialogs', async () => {
    const wrapper = await mountPanel();
    const anchor = document.querySelector<HTMLElement>(
      '.floating-panel-anchor',
    )!;
    const z = Number(getComputedStyle(anchor).zIndex);
    expect(z).toBeGreaterThanOrEqual(5000);
    expect(z).toBeLessThan(6000);
    expect(Number.parseFloat(anchor.style.left)).toBeGreaterThan(300);
    expect(document.querySelector('.test-body')).not.toBeNull();
    wrapper.unmount();
  });

  it('drags by its header', async () => {
    const wrapper = await mountPanel();
    const anchor = document.querySelector<HTMLElement>(
      '.floating-panel-anchor',
    )!;
    const beforeLeft = Number.parseFloat(anchor.style.left);
    const beforeTop = Number.parseFloat(anchor.style.top);
    const header = document.querySelector<HTMLElement>(
      '.floating-panel-header',
    )!;

    header.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 100,
        clientY: 500,
      }),
    );
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 140,
        clientY: 460,
      }),
    );
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    await nextTick();

    const moved = document.querySelector<HTMLElement>(
      '.floating-panel-anchor',
    )!;
    expect(Number.parseFloat(moved.style.left)).toBe(beforeLeft + 40);
    expect(Number.parseFloat(moved.style.top)).toBe(beforeTop - 40);
    wrapper.unmount();
  });
});
