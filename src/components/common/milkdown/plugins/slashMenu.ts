import { commandsCtx } from '@milkdown/kit/core';
import { clearTextInCurrentBlockCommand } from '@milkdown/kit/preset/commonmark';

/**
 * Remove the `/` command text typed into the current block before running a
 * custom slash-menu action. Crepe's built-in items do this through
 * `clearTextInCurrentBlockCommand`; custom items must do the same explicitly.
 */
export function clearSlashMenuText(ctx: any): void {
  ctx.get(commandsCtx).call(clearTextInCurrentBlockCommand.key);
}
