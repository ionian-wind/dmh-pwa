import { onBeforeUnmount, onMounted } from 'vue';
import type { StudioTool } from '@/map-studio/domain/document/types';

interface StudioHotkeyActions {
  save: () => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: StudioTool) => void;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]'),
  );
}

/** Keyboard shortcuts that are safe while the map studio is active. */
export function useStudioHotkeys(actions: StudioHotkeyActions): void {
  function onKeyDown(event: KeyboardEvent): void {
    if (isEditable(event.target)) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 's') {
      event.preventDefault();
      actions.save();
      return;
    }
    if (modifier && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) actions.redo();
      else actions.undo();
      return;
    }
    if (modifier && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      actions.redo();
      return;
    }
    if (modifier || event.altKey) return;
    const tool = {
      r: 'rectangle',
      c: 'circle',
      p: 'polygon',
      w: 'wall',
      h: 'pan',
    }[event.key.toLowerCase()] as StudioTool | undefined;
    if (tool) {
      event.preventDefault();
      actions.setTool(tool);
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
}
