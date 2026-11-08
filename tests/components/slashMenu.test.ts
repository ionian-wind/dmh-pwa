import { describe, expect, it, vi } from 'vitest';
import { commandsCtx } from '@milkdown/kit/core';
import { clearTextInCurrentBlockCommand } from '@milkdown/kit/preset/commonmark';

import { clearSlashMenuText } from '@/components/common/milkdown/plugins/slashMenu';

describe('slash menu helpers', () => {
  it('clears the slash command text before running a custom item', () => {
    const call = vi.fn();
    const ctx = { get: vi.fn(() => ({ call })) };

    clearSlashMenuText(ctx);

    expect(ctx.get).toHaveBeenCalledWith(commandsCtx);
    expect(call).toHaveBeenCalledWith(clearTextInCurrentBlockCommand.key);
  });
});
