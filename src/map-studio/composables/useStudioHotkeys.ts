import { onBeforeUnmount, onMounted } from 'vue';
import type { StudioTool } from '@/map-studio/domain/document/types';

interface StudioHotkeyActions {
  save: () => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: StudioTool) => void;
  deleteSelection?: () => void;
  getTool?: () => StudioTool;
  adjustSides?: (delta: -1 | 1) => void;
  setSides?: (sides: number) => void;
  cycleRough?: () => void;
  toggleMode?: () => void;
  toggleSnap?: () => void;
  setDivision?: (division: number) => void;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]'),
  );
}

/** Keyboard shortcuts that are safe while the map studio is active. */
export function useStudioHotkeys(actions: StudioHotkeyActions): void {
  let divisionPending = false;
  let toolPrefixPending = false;

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
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (actions.deleteSelection) {
        event.preventDefault();
        actions.deleteSelection();
      }
      return;
    }
    if (modifier || event.altKey) return;
    if (toolPrefixPending) {
      toolPrefixPending = false;
      const prefixed: Record<string, StudioTool> = {
        '2': 'object',
        '3': 'rectangle',
        '4': 'circle',
        '5': 'path',
        '6': 'polygon',
        '7': 'wall',
        '9': 'door',
        '0': 'stairs',
        '-': 'text',
      };
      const selected = prefixed[event.key];
      if (selected) {
        event.preventDefault();
        actions.setTool(selected);
        return;
      }
    }
    if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      toolPrefixPending = true;
      return;
    }
    if (divisionPending) {
      divisionPending = false;
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        actions.setDivision?.(Number(event.key));
        return;
      }
    }
    if (event.shiftKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      divisionPending = true;
      return;
    }
    if (event.key.toLowerCase() === 'e') {
      event.preventDefault();
      actions.toggleMode?.();
      return;
    }
    if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      actions.toggleSnap?.();
      return;
    }
    if (event.shiftKey && event.key.toLowerCase() === 'r') {
      if (actions.cycleRough) {
        event.preventDefault();
        actions.cycleRough();
      }
      return;
    }
    if (actions.getTool?.() === 'circle') {
      if (event.key === '[' || event.key === ']') {
        event.preventDefault();
        actions.adjustSides?.(event.key === '[' ? -1 : 1);
        return;
      }
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        actions.setSides?.(Number(event.key));
        return;
      }
    }
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
