import { describe, expect, it, vi } from 'vitest';
import { CrepeFeature } from '@milkdown/crepe';

import { createCrepeFeatureConfig } from '@/components/common/milkdown/crepeConfig';

const translate = (key: string) => `ru:${key}`;

function createBuilder(groups: Record<string, { label: string }> = {}) {
  const addGroup = vi.fn(() => ({ addItem: vi.fn() }));
  return {
    builder: {
      addGroup,
      getGroup: vi.fn((key: string) => {
        const group = groups[key];
        if (!group) throw new Error(`missing group ${key}`);
        return { group };
      }),
    },
    addGroup,
  };
}

describe('Crepe localization config', () => {
  it('maps block edit, toolbar and placeholder labels through i18n', () => {
    const config = createCrepeFeatureConfig(translate) as any;
    const blockEdit = config[CrepeFeature.BlockEdit];
    const toolbar = config[CrepeFeature.Toolbar];

    expect(blockEdit.textGroup).toMatchObject({
      label: 'ru:markdownEditor.crepe.text',
      h1: { label: 'ru:markdownEditor.crepe.heading1' },
      quote: { label: 'ru:markdownEditor.crepe.quote' },
    });
    expect(blockEdit.listGroup).toMatchObject({
      label: 'ru:markdownEditor.crepe.list',
      bulletList: { label: 'ru:markdownEditor.crepe.bulletList' },
    });
    expect(blockEdit.advancedGroup).toMatchObject({
      label: 'ru:markdownEditor.crepe.advanced',
      codeBlock: { label: 'ru:markdownEditor.crepe.codeBlock' },
    });
    expect(toolbar).toMatchObject({
      boldLabel: 'ru:markdownEditor.crepe.bold',
      italicLabel: 'ru:markdownEditor.crepe.italic',
      linkLabel: 'ru:markdownEditor.crepe.link',
    });
    expect(toolbar.headingOptions).toHaveLength(7);
    expect(toolbar.headingOptions[0]).toEqual({
      level: null,
      label: 'ru:markdownEditor.crepe.paragraph',
    });
    expect(config[CrepeFeature.Placeholder]).toEqual({
      text: 'ru:markdownEditor.placeholder',
    });
  });

  it('localizes existing toolbar group labels and mention items', () => {
    const config = createCrepeFeatureConfig(translate) as any;
    const groups = {
      heading: { label: 'Heading' },
      formatting: { label: 'Formatting' },
    };
    const { builder, addGroup } = createBuilder(groups);

    config[CrepeFeature.Toolbar].buildToolbar(builder);

    expect(groups.heading.label).toBe('ru:markdownEditor.crepe.heading');
    expect(groups.formatting.label).toBe('ru:markdownEditor.crepe.formatting');
    expect(addGroup).toHaveBeenCalledWith('mentions', 'ru:common.mentions');
  });

  it('still adds mentions when default toolbar groups are absent', () => {
    const config = createCrepeFeatureConfig(translate) as any;
    const { builder, addGroup } = createBuilder();

    expect(() =>
      config[CrepeFeature.Toolbar].buildToolbar(builder),
    ).not.toThrow();
    expect(addGroup).toHaveBeenCalledWith('mentions', 'ru:common.mentions');
  });

  it('localizes the block menu mention group and items', () => {
    const config = createCrepeFeatureConfig(translate) as any;
    const builder = createBuilder();
    const addItem = vi.fn();
    builder.builder.addGroup.mockReturnValue({ addItem });

    config[CrepeFeature.BlockEdit].buildMenu(builder.builder);

    expect(builder.builder.addGroup).toHaveBeenCalledWith(
      'mentions',
      'ru:common.mentions',
    );
    expect(addItem).toHaveBeenCalledWith(
      'note',
      expect.objectContaining({ label: 'ru:notes.title' }),
    );
  });
});
