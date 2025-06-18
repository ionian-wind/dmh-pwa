import { setActivePinia, createPinia } from 'pinia';
import { useNavigationStore } from '@/stores/navigation';

describe('Navigation Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('initializes lastOpenedPage from localStorage', () => {
    localStorage.setItem('lastOpenedPage', '/foo');
    const store = useNavigationStore();
    expect(store.lastOpenedPage).toBe('/foo');
  });

  it('setLastOpenedPage updates value and localStorage', () => {
    const store = useNavigationStore();
    store.setLastOpenedPage('/bar');
    expect(store.lastOpenedPage).toBe('/bar');
    expect(localStorage.getItem('lastOpenedPage')).toBe('/bar');
  });
}); 