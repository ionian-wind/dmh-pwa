import { onBeforeUnmount, onMounted } from 'vue';
import hotkeys, { type KeyHandler } from 'hotkeys-js';
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
  adjustRadius?: (delta: -1 | 1) => void;
  adjustSteps?: (delta: -1 | 1) => void;
  setSteps?: (steps: number) => void;
  cycleRough?: () => void;
  toggleMode?: () => void;
  toggleSnap?: () => void;
  setDivision?: (division: number) => void;
  cutSelection?: () => void;
  copySelection?: () => void;
  pasteSelection?: () => void;
  groupSelection?: () => void;
  nudgeSelection?: (dx: number, dy: number) => void;
  sendToBack?: () => void;
  bringToFront?: () => void;
  hasObjectSelection?: () => boolean;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]'),
  );
}

const B_TOOL_MAP: Record<string, StudioTool> = {
  '1': 'pan',
  '2': 'object',
  '3': 'rectangle',
  '4': 'circle',
  '5': 'path',
  '6': 'polygon',
  '7': 'wall',
  '8': 'select',
  '9': 'door',
  '0': 'stairs',
  '-': 'text',
};

/** Keyboard shortcuts that are safe while the map studio is active. */
export function useStudioHotkeys(actions: StudioHotkeyActions): void {
  let bPending = false;
  let divisionPending = false;
  let bPendingTimer: number | null = null;
  const bindings: Array<{ key: string; handler: KeyHandler }> = [];
  let previousFilter = hotkeys.filter;

  function bind(key: string, handler: KeyHandler): void {
    bindings.push({ key, handler });
    hotkeys(key, handler);
  }

  function clearBPending(): void {
    bPending = false;
    if (bPendingTimer !== null) {
      window.clearTimeout(bPendingTimer);
      bPendingTimer = null;
    }
  }

  function handled(event: KeyboardEvent): false {
    event.preventDefault();
    return false;
  }

  onMounted(() => {
    previousFilter = hotkeys.filter;
    hotkeys.filter = (event) => !isEditable(event.target);

    bind('ctrl+s,command+s', (event) => {
      actions.save();
      return handled(event);
    });
    bind('ctrl+z,command+z', (event) => {
      actions.undo();
      return handled(event);
    });
    bind('ctrl+shift+z,command+shift+z', (event) => {
      actions.redo();
      return handled(event);
    });
    bind('ctrl+y,command+y', (event) => {
      actions.redo();
      return handled(event);
    });
    bind('ctrl+c,command+c', (event) => {
      actions.copySelection?.();
      return handled(event);
    });
    bind('ctrl+x,command+x', (event) => {
      actions.cutSelection?.();
      return handled(event);
    });
    bind('ctrl+v,command+v', (event) => {
      actions.pasteSelection?.();
      return handled(event);
    });
    bind('delete,backspace', (event) => {
      if (!actions.deleteSelection) return true;
      actions.deleteSelection();
      return handled(event);
    });
    bind('r,c,p,w,h', (event) => {
      const tool = {
        r: 'rectangle',
        c: 'circle',
        p: 'polygon',
        w: 'wall',
        h: 'pan',
      }[event.key.toLowerCase()] as StudioTool | undefined;
      if (!tool) return true;
      actions.setTool(tool);
      return handled(event);
    });
    bind('e', (event) => {
      actions.toggleMode?.();
      return handled(event);
    });
    bind('s', (event) => {
      actions.toggleSnap?.();
      return handled(event);
    });
    bind('shift+s', (event) => {
      divisionPending = true;
      return handled(event);
    });
    bind('shift+r', (event) => {
      actions.cycleRough?.();
      return handled(event);
    });
    bind('g', (event) => {
      if (!actions.hasObjectSelection?.()) return true;
      actions.groupSelection?.();
      return handled(event);
    });
    bind(
      'up,down,left,right,shift+up,shift+down,shift+left,shift+right',
      (event) => {
        if (!actions.hasObjectSelection?.()) return true;
        const step = event.shiftKey ? 1 : 0.1;
        const dx =
          event.key === 'ArrowLeft'
            ? -step
            : event.key === 'ArrowRight'
              ? step
              : 0;
        const dy =
          event.key === 'ArrowUp'
            ? -step
            : event.key === 'ArrowDown'
              ? step
              : 0;
        actions.nudgeSelection?.(dx, dy);
        return handled(event);
      },
    );
    const bracket =
      (direction: -1 | 1): KeyHandler =>
      (event) => {
        const tool = actions.getTool?.();
        if (tool === 'circle') {
          actions.adjustSides?.(direction);
          return handled(event);
        }
        if (tool === 'path') {
          actions.adjustRadius?.(direction);
          return handled(event);
        }
        if (tool === 'stairs') {
          actions.adjustSteps?.(direction);
          return handled(event);
        }
        if (actions.hasObjectSelection?.()) {
          if (direction === -1) actions.sendToBack?.();
          else actions.bringToFront?.();
          return handled(event);
        }
        return true;
      };
    bind('[', bracket(-1));
    bind(']', bracket(1));
    bind('1,2,3,4,5,6,7,8,9,0,-', (event) => {
      if (bPending) {
        const tool = B_TOOL_MAP[event.key];
        clearBPending();
        if (tool) {
          actions.setTool(tool);
          return handled(event);
        }
        return true;
      }
      if (divisionPending) {
        divisionPending = false;
        if (/^[1-9]$/.test(event.key)) {
          actions.setDivision?.(Number(event.key));
          return handled(event);
        }
        return true;
      }
      const tool = actions.getTool?.();
      if (tool === 'circle' && /^[1-9]$/.test(event.key)) {
        actions.setSides?.(Number(event.key));
        return handled(event);
      }
      if (tool === 'stairs' && /^[1-9]$/.test(event.key)) {
        actions.setSteps?.(Number(event.key));
        return handled(event);
      }
      return true;
    });
    bind('*', (event) => {
      if (divisionPending && !/^[1-9]$/.test(event.key))
        divisionPending = false;
      if (bPending && !/^[1-9]$/.test(event.key)) clearBPending();
      return true;
    });
    bind('b', (event) => {
      bPending = true;
      if (bPendingTimer !== null) window.clearTimeout(bPendingTimer);
      bPendingTimer = window.setTimeout(clearBPending, 1500);
      return handled(event);
    });
  });

  onBeforeUnmount(() => {
    for (const { key, handler } of bindings) hotkeys.unbind(key, handler);
    bindings.length = 0;
    clearBPending();
    hotkeys.filter = previousFilter;
  });
}
