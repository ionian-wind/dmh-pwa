import { CrepeFeature } from '@milkdown/crepe';
import { buildMentionMenu, buildMentionToolbar } from './plugins/mention';

type Translate = (key: string) => string;

const HEADING_LEVELS = [null, 1, 2, 3, 4, 5, 6] as const;

export function createCrepeFeatureConfig(translate: Translate) {
  const t = (key: string) => translate(`markdownEditor.crepe.${key}`);

  return {
    [CrepeFeature.BlockEdit]: {
      textGroup: {
        label: t('text'),
        text: { label: t('text') },
        h1: { label: t('heading1') },
        h2: { label: t('heading2') },
        h3: { label: t('heading3') },
        h4: { label: t('heading4') },
        h5: { label: t('heading5') },
        h6: { label: t('heading6') },
        quote: { label: t('quote') },
        divider: { label: t('divider') },
      },
      listGroup: {
        label: t('list'),
        bulletList: { label: t('bulletList') },
        orderedList: { label: t('orderedList') },
        taskList: { label: t('taskList') },
      },
      advancedGroup: {
        label: t('advanced'),
        image: { label: t('image') },
        codeBlock: { label: t('codeBlock') },
        table: { label: t('table') },
        math: { label: t('math') },
      },
      buildMenu: (builder: any) => buildMentionMenu(builder, translate),
    },
    [CrepeFeature.Toolbar]: {
      boldLabel: t('bold'),
      italicLabel: t('italic'),
      strikethroughLabel: t('strikethrough'),
      codeLabel: t('inlineCode'),
      linkLabel: t('link'),
      latexLabel: t('latex'),
      aiLabel: t('ai'),
      headingOptions: HEADING_LEVELS.map((level) => ({
        level,
        label: level === null ? t('paragraph') : t(`heading${level}`),
      })),
      buildToolbar: (builder: any) => {
        try {
          builder.getGroup('heading').group.label = t('heading');
        } catch {
          // Feature groups are provided by Crepe; ignore if absent.
        }
        try {
          builder.getGroup('formatting').group.label = t('formatting');
        } catch {
          // Feature groups are provided by Crepe; ignore if absent.
        }
        buildMentionToolbar(builder, translate);
      },
    },
    [CrepeFeature.Placeholder]: {
      text: translate('markdownEditor.placeholder'),
    },
  };
}
