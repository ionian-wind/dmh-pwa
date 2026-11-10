import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StudioObjectBatchSettings from '@/map-studio/components/StudioObjectBatchSettings.vue';
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

function mountBatch(pinia: ReturnType<typeof createPinia>) {
  return mount(StudioObjectBatchSettings, {
    global: { plugins: [pinia] },
  });
}

function field(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper
    .findAll('label')
    .find((entry) => entry.text().includes(label))!;
}

describe('StudioObjectBatchSettings', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders nothing without a multi-selection', () => {
    const { store, pinia } = setup();
    store.addText('A', [1, 1]);
    store.selectObject(store.imagesLayer!.objects[0].id);
    const wrapper = mountBatch(pinia);
    expect(wrapper.text()).toBe('');
    wrapper.unmount();
  });

  it('edits common text properties and runs batch actions', async () => {
    const { store, pinia } = setup();
    store.addText('A', [1, 1]);
    store.addText('B', [3, 3]);
    store.selectObjects(store.imagesLayer!.objects.map((object) => object.id));
    const wrapper = mountBatch(pinia);
    expect(wrapper.text()).toContain('2 objects selected');

    const opacity = field(wrapper, 'Opacity').find('input[type="range"]');
    await opacity.setValue('0.4');
    expect(store.imagesLayer!.objects.map((object) => object.opacity)).toEqual([
      0.4, 0.4,
    ]);

    const rotation = field(wrapper, 'Rotation').find('input');
    await rotation.setValue('1.5');
    expect(
      store.imagesLayer!.objects.map((object) => object.transform.rotation),
    ).toEqual([1.5, 1.5]);

    const size = field(wrapper, 'Font size').findAll('input')[0];
    await size.setValue('0.5');
    expect(
      store.imagesLayer!.objects.map((object) =>
        object.type === 'text' ? object.fontSize : 0,
      ),
    ).toEqual([0.5, 0.5]);

    const color = field(wrapper, 'Font size').findAll('input')[1];
    await color.setValue('#112233');
    expect(
      store.imagesLayer!.objects.map((object) =>
        object.type === 'text' ? object.color : '',
      ),
    ).toEqual(['#112233', '#112233']);

    await wrapper.find('[title="Flip horizontal"]').trigger('click');
    expect(
      store.imagesLayer!.objects.every((object) => object.transform.flipX),
    ).toBe(true);
    await wrapper.find('[title="Flip vertical"]').trigger('click');
    expect(
      store.imagesLayer!.objects.every((object) => object.transform.flipY),
    ).toBe(true);
    await wrapper.find('[title="Bring forward"]').trigger('click');
    await wrapper.find('[title="Send backward"]').trigger('click');
    await wrapper.find('[title="Duplicate"]').trigger('click');
    expect(store.imagesLayer!.objects).toHaveLength(4);
    await wrapper.find('[title="Delete"]').trigger('click');
    expect(store.imagesLayer!.objects).toHaveLength(2);
    wrapper.unmount();
  });

  it('shows and edits shared door properties', async () => {
    const { store, pinia } = setup();
    store.addDoor([0, 0], [1, 0]);
    store.addDoor([2, 0], [3, 0]);
    store.updateObject(store.imagesLayer!.objects[0].id, { variant: 1 });
    store.selectObjects(store.imagesLayer!.objects.map((object) => object.id));
    const wrapper = mountBatch(pinia);
    expect(wrapper.text()).toContain('Mixed');
    const variant = field(wrapper, 'Variant').find('select');
    await variant.setValue('1');
    expect(
      store.imagesLayer!.objects.every(
        (object) => object.type === 'door' && object.variant === 1,
      ),
    ).toBe(true);
    wrapper.unmount();
  });

  it('shows and edits shared stairs properties', async () => {
    const { store, pinia } = setup();
    store.addStairs([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    store.addStairs([
      [2, 0],
      [3, 0],
      [3, 1],
    ]);
    store.updateObject(store.imagesLayer!.objects[1].id, { stepsPerCell: 6 });
    store.selectObjects(store.imagesLayer!.objects.map((object) => object.id));
    const wrapper = mountBatch(pinia);
    const steps = field(wrapper, 'Steps').find('input');
    await steps.setValue('5');
    expect(
      store.imagesLayer!.objects.every(
        (object) => object.type === 'stairs' && object.stepsPerCell === 5,
      ),
    ).toBe(true);
    wrapper.unmount();
  });

  it('labels mixed common values and applies a new value', async () => {
    const { store, pinia } = setup();
    store.addText('A', [1, 1]);
    store.addText('B', [3, 3]);
    const [a, b] = store.imagesLayer!.objects;
    store.updateObject(a.id, { opacity: 0.2 });
    store.updateObject(b.id, { opacity: 0.8 });
    store.updateObject(b.id, {
      transform: { ...b.transform, rotation: 1 },
      ...(b.type === 'text' ? { fontSize: 0.5, color: '#445566' } : {}),
    });
    store.selectObjects([a.id, b.id]);
    const wrapper = mountBatch(pinia);
    expect(wrapper.text()).toContain('Mixed');
    const opacity = field(wrapper, 'Opacity').find('input[type="range"]');
    await opacity.setValue('0.5');
    expect(store.imagesLayer!.objects.map((object) => object.opacity)).toEqual([
      0.5, 0.5,
    ]);
    const rotation = field(wrapper, 'Rotation').find('input');
    await rotation.setValue('2');
    expect(
      store.imagesLayer!.objects.map((object) => object.transform.rotation),
    ).toEqual([2, 2]);
    wrapper.unmount();
  });

  it('groups and ungroups the selection', async () => {
    const { store, pinia } = setup();
    store.addText('A', [1, 1]);
    store.addText('B', [3, 3]);
    store.selectObjects(store.imagesLayer!.objects.map((object) => object.id));
    const wrapper = mountBatch(pinia);
    await wrapper.find('[title="Group"]').trigger('click');
    expect(store.selectedGroupId).toBeTruthy();
    await wrapper.find('[title="Ungroup"]').trigger('click');
    expect(store.selectedGroupId).toBeNull();
    wrapper.unmount();
  });

  it('hides type-specific fields for a mixed selection', async () => {
    const { store, pinia } = setup();
    store.addText('A', [1, 1]);
    store.addDoor([2, 2], [3, 2]);
    store.selectObjects(store.imagesLayer!.objects.map((object) => object.id));
    const wrapper = mountBatch(pinia);
    expect(wrapper.text()).toContain('2 objects selected');
    expect(wrapper.text()).not.toContain('Font size');
    expect(wrapper.text()).not.toContain('Variant');
    expect(wrapper.text()).not.toContain('Steps');
    wrapper.unmount();
  });
});

describe('StudioObjectBatchSettings empty state', () => {
  it('exposes empty common values without objects', () => {
    const { pinia } = setup();
    const wrapper = mountBatch(pinia);
    const vm = wrapper.vm as any;
    expect(vm.type).toBeNull();
    expect(vm.opacity).toBeUndefined();
    expect(vm.rotation).toBeUndefined();
    wrapper.unmount();
  });
});
