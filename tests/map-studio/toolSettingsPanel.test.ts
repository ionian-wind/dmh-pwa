import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StudioToolSettingsPanel from '@/map-studio/components/StudioToolSettingsPanel.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';

function setup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useMapStudioStore();
  store.setMap(createMap(createProject().id));
  return { store, pinia };
}

function mountPanel(pinia: ReturnType<typeof createPinia>) {
  return mount(StudioToolSettingsPanel, {
    global: { plugins: [pinia] },
  });
}

function label(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper
    .findAll('label, .settings-row')
    .find((row) => row.text().includes(text))!;
}

describe('StudioToolSettingsPanel', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('edits common mode, snap and division settings', async () => {
    const { store, pinia } = setup();
    const wrapper = mountPanel(pinia);
    await wrapper.findAll('.settings-segment button')[1].trigger('click');
    expect(store.toolSettings.mode).toBe('erase');
    const snap = wrapper.findAll('input[type="checkbox"]')[0];
    await snap.setValue(false);
    expect(store.toolSettings.snap).toBe(false);
    const division = wrapper.findAll('select')[0];
    await division.setValue('3');
    expect(Number(store.toolSettings.division)).toBe(3);
    wrapper.unmount();
  });

  it('edits circle sides and orientation', async () => {
    const { store, pinia } = setup();
    store.setTool('circle');
    const wrapper = mountPanel(pinia);
    const sides = wrapper.find('.studio-sides-input');
    await sides.setValue('6');
    expect(store.toolSettings.sides).toBe(6);
    const drawTo = wrapper
      .findAll('select')
      .find((select) =>
        select
          .findAll('option')
          .some((option) => option.attributes('value') === 'edge'),
      )!;
    await drawTo.setValue('edge');
    expect(store.toolSettings.drawTo).toBe('edge');
    wrapper.unmount();
  });

  it('edits wall, stairs and door settings', async () => {
    const { store, pinia } = setup();
    store.setTool('wall');
    const wall = mountPanel(pinia);
    const dashToggle = wall
      .findAll('input[type="checkbox"]')
      .find((input) =>
        input.element.closest('.settings-row')?.textContent?.includes('Dash'),
      )!;
    await dashToggle.setValue(true);
    expect(store.toolSettings.wallDash).toBe(true);
    wall.unmount();

    store.setTool('stairs');
    const stairs = mountPanel(pinia);
    const steps = label(stairs, 'Steps').find('input[type="number"]');
    await steps.setValue('5');
    expect(store.toolSettings.stairsSteps).toBe(5);
    const stairsColor = stairs.find('input[type="color"]');
    await stairsColor.setValue('#112233');
    expect(store.toolSettings.stairsStroke).toBe('#112233');
    stairs.unmount();

    store.setTool('door');
    const door = mountPanel(pinia);
    const colors = door.findAll('input[type="color"]');
    await colors[0].setValue('#445566');
    expect(store.toolSettings.doorFill).toBe('#445566');
    await colors[1].setValue('#778899');
    expect(store.toolSettings.doorStroke).toBe('#778899');
    door.unmount();
  });

  it('edits text styling and shadow settings', async () => {
    const { store, pinia } = setup();
    store.setTool('text');
    const wrapper = mountPanel(pinia);
    const font = wrapper
      .findAll('select')
      .find((select) =>
        select
          .findAll('option')
          .some((option) => option.text().includes('Arial')),
      )!;
    await font.setValue('Arial, sans-serif');
    expect(store.toolSettings.text.fontFamily).toBe('Arial, sans-serif');
    const alignRight = wrapper.find('[aria-label="Right"]');
    await alignRight.trigger('click');
    expect(store.toolSettings.text.align).toBe('right');
    const shadow = wrapper
      .findAll('input[type="checkbox"]')
      .find((input) =>
        input.element
          .closest('.settings-row')
          ?.textContent?.includes('Drop shadow'),
      )!;
    await shadow.setValue(true);
    expect(store.toolSettings.text.shadow.enabled).toBe(true);
    const colorInputs = wrapper.findAll('input[type="color"]');
    await colorInputs.at(-1)!.setValue('#abcdef');
    expect(store.toolSettings.text.shadow.color).toBe('#abcdef');
    wrapper.unmount();
  });

  it('edits path and rectangle specific settings', async () => {
    const { store, pinia } = setup();
    store.setTool('path');
    const path = mountPanel(pinia);
    const radius = label(path, 'Radius').find('input[type="number"]');
    await radius.setValue('0.5');
    expect(store.toolSettings.pathRadius).toBe(0.5);
    path.unmount();

    store.setTool('rectangle');
    const rect = mountPanel(pinia);
    const corner = label(rect, 'Corner').find('input[type="number"]');
    await corner.setValue('0.4');
    expect(store.toolSettings.cornerRadius).toBe(0.4);
    rect.unmount();
  });
});
