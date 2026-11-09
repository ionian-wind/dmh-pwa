import { onBeforeUnmount, watch } from 'vue';
import type { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';

type StudioStore = ReturnType<typeof useMapStudioStore>;

/** Debounced local autosave for the current studio map. */
export function useMapStudioAutosave(store: StudioStore, delay = 900): void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(
    () => store.map,
    () => {
      if (!store.dirty) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void store.save(), delay);
    },
  );

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
    if (store.dirty) void store.save();
  });
}
