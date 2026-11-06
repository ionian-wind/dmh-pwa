import { computed, onBeforeUnmount, onMounted, reactive, type Ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import {
  confirmUnsavedChanges,
  type UnsavedChangesChoice,
} from '@/dialogs/unsavedChanges';
import type { InlineEditState } from '@/types';

export interface UseEntityEditModeOptions<T> {
  /** Current persisted entity. */
  source: Ref<T | null | undefined>;
  /** Create an editable copy of the entity. */
  clone: (source: T) => T;
  /** Optional custom dirty comparison; defaults to JSON equality. */
  isDirty?: (draft: T, source: T) => boolean;
  /** Extra dirty flag for content that is not reflected in the draft yet. */
  extraDirty?: () => boolean;
  /** Validate / sync editor refs before saving. Return false to block. */
  prepare?: (draft: T) => Promise<boolean> | boolean;
  /** Persist the draft. Return false when saving failed. */
  save: (draft: T) => Promise<boolean> | boolean;
  onEnter?: (draft: T) => void;
  onDiscard?: (draft: T | null) => void;
}

/**
 * Shared view/edit mode behavior for entity detail pages:
 * draft lifecycle, dirty tracking, save-on-view, unsaved navigation guards and
 * the browser close guard.
 */
export function useEntityEditMode<T>(options: UseEntityEditModeOptions<T>) {
  const editState = reactive({
    isEditMode: false,
    isVisualMode: true,
    draft: null as T | null,
  }) as InlineEditState<T>;

  const isDirty = computed(() => {
    const source = options.source.value;
    const draft = editState.draft;
    if (!editState.isEditMode || !source || !draft) return false;
    if (options.extraDirty?.()) return true;
    if (options.isDirty) return options.isDirty(draft, source);
    return JSON.stringify(draft) !== JSON.stringify(source);
  });

  function enterEditMode() {
    const source = options.source.value;
    if (!source) return;
    const draft = options.clone(source);
    editState.draft = draft;
    options.onEnter?.(draft);
    editState.isEditMode = true;
  }

  function discardDraft() {
    const draft = editState.draft;
    editState.isEditMode = false;
    editState.draft = null;
    options.onDiscard?.(draft);
  }

  async function saveDraft(): Promise<boolean> {
    if (!editState.isEditMode) return true;

    const draft = editState.draft;
    if (!draft || !options.source.value) {
      discardDraft();
      return true;
    }
    if (!isDirty.value) {
      discardDraft();
      return true;
    }
    if (options.prepare && !(await options.prepare(draft))) {
      return false;
    }
    if (!(await options.save(draft))) {
      return false;
    }
    discardDraft();
    return true;
  }

  async function setEditMode(value: boolean) {
    if (value === editState.isEditMode) return;
    if (value) {
      enterEditMode();
    } else {
      await saveDraft();
    }
  }

  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true;

    const choice: UnsavedChangesChoice = await confirmUnsavedChanges();
    if (choice === 'cancel') return false;
    if (choice === 'discard') {
      discardDraft();
      return true;
    }
    return saveDraft();
  });

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value) return;
    event.preventDefault();
    event.returnValue = '';
  }

  onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload));
  onBeforeUnmount(() =>
    window.removeEventListener('beforeunload', handleBeforeUnload),
  );

  return {
    editState,
    isDirty,
    enterEditMode,
    discardDraft,
    saveDraft,
    setEditMode,
  };
}
