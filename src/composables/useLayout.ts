import {
  inject,
  provide,
  ref,
  shallowRef,
  unref,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from 'vue';
import type { ComponentInjection } from '@/types';

export type LayoutOwner = symbol;

export interface LayoutStore {
  topMenuContent: ShallowRef<ComponentInjection>;
  rightDrawerContent: ShallowRef<ComponentInjection>;
  bottomDrawerContent: ShallowRef<ComponentInjection>;
  rightDrawerOpen: Ref<boolean>;
  setTopMenuContent: (content: ComponentInjection) => void;
  setRightDrawerContent: (
    content: ComponentInjection,
    owner?: LayoutOwner,
  ) => void;
  clearRightDrawer: (owner?: LayoutOwner) => void;
  setBottomDrawerContent: (content: ComponentInjection) => void;
  toggleRightDrawer: () => void;
}

export const LayoutKey: InjectionKey<LayoutStore> = Symbol('dmh-layout');

/**
 * Resolve refs passed as injected component props. Views often hand their
 * reactive entity to the drawer (`{ monster }`), and the injected component
 * expects plain values. Unref runs during render, so the drawer still updates
 * when the source ref changes.
 */
export function unwrapProps(
  props?: Record<string, any>,
): Record<string, any> | undefined {
  if (!props) return undefined;
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, unref(value)]),
  );
}

export function createLayoutStore(): LayoutStore {
  const topMenuContent = shallowRef<ComponentInjection>(null);
  const rightDrawerContent = shallowRef<ComponentInjection>(null);
  const bottomDrawerContent = shallowRef<ComponentInjection>(null);
  const rightDrawerOpen = ref(true);
  let rightDrawerOwner: LayoutOwner | null = null;

  return {
    topMenuContent,
    rightDrawerContent,
    bottomDrawerContent,
    rightDrawerOpen,
    setTopMenuContent(content) {
      topMenuContent.value = content;
    },
    setRightDrawerContent(content, owner) {
      rightDrawerContent.value = content;
      rightDrawerOwner = content ? (owner ?? null) : null;
    },
    clearRightDrawer(owner) {
      if (owner && rightDrawerOwner && rightDrawerOwner !== owner) {
        return;
      }
      rightDrawerContent.value = null;
      rightDrawerOwner = null;
    },
    setBottomDrawerContent(content) {
      bottomDrawerContent.value = content;
    },
    toggleRightDrawer() {
      rightDrawerOpen.value = !rightDrawerOpen.value;
    },
  };
}

export function provideLayout(
  store: LayoutStore = createLayoutStore(),
): LayoutStore {
  provide(LayoutKey, store);
  return store;
}

export function useLayout(): LayoutStore {
  const layout = inject(LayoutKey);
  if (!layout) {
    throw new Error(
      'Layout store not provided. Call provideLayout() in the app shell.',
    );
  }
  return layout;
}

/**
 * Per-view right-drawer handle. Only the view that set the current content can
 * clear it, so overlapping mounts cannot remove another view's sidebar.
 */
export function useRightDrawer() {
  const layout = useLayout();
  const owner: LayoutOwner = Symbol('right-drawer-owner');

  return {
    set(content: ComponentInjection) {
      layout.setRightDrawerContent(content, owner);
    },
    clear() {
      layout.clearRightDrawer(owner);
    },
  };
}
