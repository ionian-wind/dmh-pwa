import { mount } from '@vue/test-utils';
import MonsterEditor from '@/components/MonsterEditor.vue';
import { vi } from 'vitest';

vi.mock('@/components/ModuleSelector.vue', () => ({
  __esModule: true,
  default: { name: 'ModuleSelector', template: '<div />' }
}));
vi.mock('@/components/common/BaseModal.vue', () => ({
  __esModule: true,
  default: { name: 'BaseModal', template: '<div><slot /></div>' }
}));
vi.mock('@/components/common/Button.vue', () => ({
  __esModule: true,
  default: { name: 'Button', template: '<button><slot /></button>' }
}));
vi.mock('@/stores/monsters', () => ({
  useMonsterStore: () => ({})
}));
vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({ currentModule: { id: 'mod-1', name: 'Module One' } })
}));
window.alert = vi.fn();

describe('MonsterEditor', () => {
  const monster = {
    id: 'm1',
    name: 'Goblin',
    type: 'Humanoid',
    size: 'Small',
    alignment: 'Chaotic Evil',
    armorClass: 13,
    hitPoints: 7,
    speed: { walk: 30 },
    stats: {
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8
    },
    savingThrows: {},
    skills: {},
    damageVulnerabilities: [],
    damageResistances: [],
    damageImmunities: [],
    conditionImmunities: [],
    senses: [],
    languages: ['Common'],
    challengeRating: 1,
    xp: 50,
    specialAbilities: [],
    actions: [],
    legendaryActions: [],
    description: '',
    moduleId: 'mod-1',
    createdAt: 0,
    updatedAt: 0
  };

  it('renders with monster data', () => {
    const wrapper = mount(MonsterEditor, {
      props: { monster, isOpen: true }
    });
    expect(wrapper.find('input[type="text"]').element.value).toBe('Goblin');
  });

  it('emits submit with edited monster', async () => {
    const wrapper = mount(MonsterEditor, {
      props: { monster, isOpen: true }
    });
    await wrapper.find('input[type="text"]').setValue('Orc');
    await wrapper.vm.saveMonster();
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')[0][0].name).toBe('Orc');
  });

  it('emits cancel on closeEditor', async () => {
    const wrapper = mount(MonsterEditor, {
      props: { monster, isOpen: true }
    });
    await wrapper.vm.closeEditor();
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('shows alert if name or type is missing on submit', async () => {
    const wrapper = mount(MonsterEditor, {
      props: { monster: { ...monster, name: '', type: '' }, isOpen: true }
    });
    await wrapper.vm.saveMonster();
    expect(window.alert).toHaveBeenCalledWith('Name and type are required');
  });
}); 