import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';

const promptMock = vi.hoisted(() => vi.fn());
const confirmMock = vi.hoisted(() => vi.fn());
const layoutMock = vi.hoisted(() => ({
  setTopMenuContent: vi.fn(),
  setRightDrawer: vi.fn(),
  clearRightDrawer: vi.fn(),
}));

vi.mock('@/dialogs', () => ({ prompt: promptMock, confirm: confirmMock }));
vi.mock('@/composables/useLayout', () => ({
  useLayout: () => ({ setTopMenuContent: layoutMock.setTopMenuContent }),
  useRightDrawer: () => ({
    set: layoutMock.setRightDrawer,
    clear: layoutMock.clearRightDrawer,
  }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('vue3-charts', async () => {
  const { defineComponent, h } = await import('vue');
  const layerStub = (name: string) =>
    defineComponent({
      name,
      setup(_, { slots }) {
        return () => h('div', { 'data-chart-stub': name }, slots.default?.());
      },
    });

  return {
    Chart: defineComponent({
      name: 'Chart',
      setup(_, { slots }) {
        return () => h('div', { 'data-chart-stub': 'Chart' }, slots.layers?.());
      },
    }),
    Grid: layerStub('Grid'),
    Line: layerStub('Line'),
    Tooltip: layerStub('Tooltip'),
    Responsive: defineComponent({
      name: 'Responsive',
      setup(_, { slots }) {
        return () =>
          h(
            'div',
            { 'data-chart-stub': 'Responsive' },
            slots.main?.({ width: 800, height: 400 }),
          );
      },
    }),
  };
});

vi.mock('@/components/common/MonacoEditor.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      name: 'MonacoEditor',
      props: { modelValue: { type: String, default: '' } },
      emits: ['update:modelValue'],
      setup(props, { emit }) {
        return () =>
          h('textarea', {
            class: 'monaco-editor-stub',
            value: props.modelValue,
            onInput: (event: Event) =>
              emit(
                'update:modelValue',
                (event.target as HTMLTextAreaElement).value,
              ),
          });
      },
    }),
  };
});

vi.mock('../anydiceLanguage', () => ({
  ANYDICE_LANGUAGE_ID: 'anydice',
  registerAnyDiceLanguage: vi.fn(),
}));

import ProbabilityCalculatorView from '../ProbabilityCalculatorView.vue';
import { encodeSource } from '../shareLink';
import { CODE_LIBRARY_STORAGE_KEY } from '../codeLibrary';

async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flushPromises();
  await nextTick();
}

async function mountPage() {
  const wrapper = mount(ProbabilityCalculatorView);
  await settle();
  return wrapper;
}

function libraryState() {
  const content = layoutMock.setRightDrawer.mock.calls.at(-1)?.[0] as any;
  return content.props.state;
}

describe('ProbabilityCalculatorView', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReset();
    promptMock.mockReset();
    confirmMock.mockReset();
    history.replaceState(null, '', '/dmh-pwa/probability-calculator');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('calculates the default program and shows a table', async () => {
    const wrapper = await mountPage();

    expect(wrapper.findAll('.probability-table tbody tr')).toHaveLength(16);
    expect(wrapper.text()).toContain('Mean');
    expect(wrapper.text()).toContain('10.500');
    expect(wrapper.text()).toContain('12.50%');
    wrapper.unmount();
  });

  it('switches to graph, summary and export views', async () => {
    const wrapper = await mountPage();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Graph')!
      .trigger('click');
    expect(wrapper.find('.probability-chart-wrapper').exists()).toBe(true);
    expect(wrapper.find('[data-chart-stub="Chart"]').exists()).toBe(true);

    await wrapper.find('button[aria-label="Zoom in chart"]').trigger('click');
    expect(wrapper.text()).toContain('125%');
    await wrapper
      .find('button[aria-label="Reset chart zoom"]')
      .trigger('click');
    expect(wrapper.text()).toContain('100%');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Summary')!
      .trigger('click');
    expect(wrapper.text()).toContain('Most likely');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Export')!
      .trigger('click');
    const exportInput = wrapper.find('[data-test="export-output"]');
    expect(exportInput.exists()).toBe(true);
    expect((exportInput.element as HTMLInputElement).value).toContain(
      'Output,Value,Probability',
    );

    const copyButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Copy'))!;
    await copyButton.trigger('click');
    await settle();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    const downloadButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Download'))!;
    await downloadButton.trigger('click');
    expect(URL.createObjectURL).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('switches to transposed and at-least tables', async () => {
    const wrapper = await mountPage();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Transposed')!
      .trigger('click');
    expect(wrapper.text()).toContain('Output 1');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'At Least')!
      .trigger('click');
    expect(wrapper.text()).toContain('100.00%');
    wrapper.unmount();
  });

  it('rolls the selected output', async () => {
    const wrapper = await mountPage();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Roller')!
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Roll')!
      .trigger('click');

    expect(wrapper.findAll('.roller-result').length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('creates a share link and clears it when the source changes', async () => {
    const wrapper = await mountPage();
    const input = () => wrapper.find('[data-test="share-link-input"]');

    await wrapper.find('[data-test="create-share-link"]').trigger('click');
    await settle();

    const link = (input().element as HTMLInputElement).value;
    expect(link).toContain('#code=');
    expect(window.location.hash).toContain('#code=');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(link);

    await wrapper.find('textarea.monaco-editor-stub').setValue('output 1d8');
    await settle();

    expect((input().element as HTMLInputElement).value).toBe('');
    expect(window.location.hash).toBe('');
    wrapper.unmount();
  });

  it('loads a program from a shared link', async () => {
    history.replaceState(null, '', `#code=${encodeSource('output 1d4')}`);
    const wrapper = await mountPage();

    expect(
      (
        wrapper.find('textarea.monaco-editor-stub')
          .element as HTMLTextAreaElement
      ).value,
    ).toBe('output 1d4');
    expect(
      (
        wrapper.find('[data-test="share-link-input"]')
          .element as HTMLInputElement
      ).value,
    ).toContain('#code=');
    wrapper.unmount();
  });

  it('saves a library piece and selects it', async () => {
    promptMock.mockResolvedValueOnce('My piece');
    const wrapper = await mountPage();
    const state = libraryState();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save')!
      .trigger('click');
    await settle();

    expect(state.pieces).toHaveLength(1);
    expect(state.pieces[0].name).toBe('My piece');
    expect(state.pieces[0].code).toBe('output 3d6');
    expect(state.selectedId).toBe(state.pieces[0].id);
    wrapper.unmount();
  });

  it('confirms before replacing dirty editor content with a library piece', async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
      key === CODE_LIBRARY_STORAGE_KEY
        ? JSON.stringify([
            {
              id: 'piece-1',
              name: 'Piece',
              code: 'output 1d4',
              include: false,
            },
          ])
        : null,
    );
    const wrapper = await mountPage();
    const state = libraryState();
    const editor = wrapper.find('textarea.monaco-editor-stub');

    await editor.setValue('output 1d8');
    confirmMock.mockResolvedValueOnce(false);
    await state.onLoad(state.pieces[0]);
    await settle();
    expect((editor.element as HTMLTextAreaElement).value).toBe('output 1d8');

    confirmMock.mockResolvedValueOnce(true);
    await state.onLoad(state.pieces[0]);
    await settle();
    expect((editor.element as HTMLTextAreaElement).value).toBe('output 1d4');
    expect(wrapper.text()).toContain('Run a calculation');
    wrapper.unmount();
  });

  it('includes checked library pieces in the calculation namespace', async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
      key === CODE_LIBRARY_STORAGE_KEY
        ? JSON.stringify([
            { id: 'piece-1', name: 'Variable', code: 'A: 1', include: true },
          ])
        : null,
    );
    const wrapper = await mountPage();
    await wrapper.find('textarea.monaco-editor-stub').setValue('output A');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Calculate')!
      .trigger('click');
    await settle();

    expect(wrapper.findAll('.probability-table tbody tr')).toHaveLength(1);
    expect(wrapper.find('.probability-table tbody').text()).toContain('1');
    wrapper.unmount();
  });

  it('shows calculation errors', async () => {
    const wrapper = await mountPage();
    const editor = wrapper.find('textarea.monaco-editor-stub');
    await editor.setValue('output 1 +');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Calculate')!
      .trigger('click');
    await settle();

    expect(wrapper.text()).toContain('Calculation error');
    wrapper.unmount();
  });
});
