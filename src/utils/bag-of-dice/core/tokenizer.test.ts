// Mock tokenizer coordination tests (no real tokenization logic)
describe('Tokenizer Coordination', () => {
  it('delegates to plugins in order', () => {
    const calls: string[] = [];
    const plugins = [
      { name: 'pluginA', match: (input: string) => { calls.push('A'); return false; } },
      { name: 'pluginB', match: (input: string) => { calls.push('B'); return true; } },
      { name: 'pluginC', match: (input: string) => { calls.push('C'); return false; } },
    ];
    // Simulate coordination logic
    let matched = false;
    for (const plugin of plugins) {
      if (plugin.match('test')) {
        matched = true;
        break;
      }
    }
    expect(matched).toBe(true);
    expect(calls).toEqual(['A', 'B']);
  });

  it('collects errors from plugins', () => {
    const errors: string[] = [];
    const plugins = [
      { name: 'pluginA', match: () => { errors.push('errorA'); return false; } },
      { name: 'pluginB', match: () => false },
    ];
    for (const plugin of plugins) {
      plugin.match('test');
    }
    expect(errors).toContain('errorA');
  });

  it('collects warnings from plugins', () => {
    const warnings: string[] = [];
    const plugins = [
      { name: 'pluginA', warn: () => { warnings.push('warnA'); } },
      { name: 'pluginB', warn: () => { warnings.push('warnB'); } },
    ];
    for (const plugin of plugins) {
      plugin.warn();
    }
    expect(warnings).toEqual(['warnA', 'warnB']);
  });
}); 