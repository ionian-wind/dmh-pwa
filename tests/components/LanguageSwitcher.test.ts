import { mount } from '@vue/test-utils';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

jest.mock('vue-i18n', () => {
  let locale = { value: 'en' };
  return {
    useI18n: () => ({
      locale
    })
  };
});

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders select with language options', () => {
    const wrapper = mount(LanguageSwitcher);
    expect(wrapper.find('select.language-select').exists()).toBe(true);
    expect(wrapper.findAll('option').length).toBe(2);
  });

  it('changes language and updates localStorage', async () => {
    const wrapper = mount(LanguageSwitcher);
    const select = wrapper.find('select');
    await select.setValue('es');
    expect(localStorage.getItem('dnd-language')).toBe('es');
  });

  it('select reflects current locale', () => {
    const wrapper = mount(LanguageSwitcher);
    expect(wrapper.find('select').element.value).toBe('en');
  });
}); 