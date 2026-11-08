import { describe, expect, it, vi } from 'vitest';
import { CrepeFeature } from '@milkdown/crepe';

import { createCrepeFeatureConfig } from '@/components/common/milkdown/crepeConfig';
import { buildDrawingMenu } from '@/components/common/milkdown/plugins/drawing';
import {
  resolveStoredFileUrl,
  uploadStoredFile,
} from '@/utils/files/markdownUrls';

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
      boldIcon: expect.stringContaining('icon-tabler-bold'),
      italicIcon: expect.stringContaining('icon-tabler-italic'),
      linkIcon: expect.stringContaining('icon-tabler-link'),
      strikethroughIcon: expect.stringContaining('icon-tabler-strikethrough'),
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

  it('uses app file handling for image uploads', () => {
    const config = createCrepeFeatureConfig(translate) as any;
    const image = config[CrepeFeature.ImageBlock];

    expect(image.inlineOnUpload).toBe(uploadStoredFile);
    expect(image.blockOnUpload).toBe(uploadStoredFile);
    expect(image.proxyDomURL).toBe(resolveStoredFileUrl);
    expect(image.inlineImageIcon).toContain('icon-tabler-photo');
  });

  it('uses Tabler icons across Crepe features', () => {
    const config = createCrepeFeatureConfig(translate) as any;

    expect(config[CrepeFeature.Toolbar].boldIcon).toContain('icon-tabler-bold');
    expect(config[CrepeFeature.ListItem].checkBoxCheckedIcon).toContain(
      'icon-tabler-square-check',
    );
    expect(config[CrepeFeature.Table].addRowIcon).toContain(
      'icon-tabler-row-insert-bottom',
    );
    expect(config[CrepeFeature.BlockEdit].handleDragIcon).toContain(
      'icon-tabler-grip-vertical',
    );
    expect(config[CrepeFeature.BlockEdit].advancedGroup.table.icon).toContain(
      'icon-tabler-table',
    );
    expect(config[CrepeFeature.BlockEdit].advancedGroup.image.icon).toContain(
      'icon-tabler-photo',
    );
    expect(
      config[CrepeFeature.BlockEdit].advancedGroup.codeBlock.icon,
    ).toContain('icon-tabler-code');
    expect(config[CrepeFeature.BlockEdit].listGroup.taskList.icon).toContain(
      'icon-tabler-list-check',
    );
    expect(config[CrepeFeature.LinkTooltip].removeButton).toContain(
      'icon-tabler-x',
    );
  });

  it('adds a drawing item to the advanced block menu', () => {
    const addItem = vi.fn();
    const builder = {
      getGroup: vi.fn(() => ({ addItem })),
    };

    buildDrawingMenu(builder, translate);

    expect(builder.getGroup).toHaveBeenCalledWith('advanced');
    expect(addItem).toHaveBeenCalledWith(
      'drawing',
      expect.objectContaining({
        label: 'ru:drawing.add',
        icon: expect.any(String),
        onRun: expect.any(Function),
      }),
    );
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
