import { CrepeFeature } from '@milkdown/crepe';
import { buildMentionMenu, buildMentionToolbar } from './plugins/mention';
import { buildDrawingMenu } from './plugins/drawing';
import {
  resolveStoredFileUrl,
  uploadStoredFile,
} from '@/utils/files/markdownUrls';
import {
  alignCenterIcon,
  alignLeftIcon,
  alignRightIcon,
  boldIcon,
  checkIcon,
  listCheckIcon,
  chevronDownIcon,
  chevronLeftIcon,
  chevronRightIcon,
  codeBlockIcon,
  codeIcon,
  columnInsertRightIcon,
  columnRemoveIcon,
  copyIcon,
  cornerDownLeftIcon,
  eyeOffIcon,
  gripHorizontalIcon,
  gripVerticalIcon,
  headingIcon,
  italicIcon,
  linkIcon,
  listIcon,
  listNumbersIcon,
  mathIcon,
  paragraphIcon,
  pencilIcon,
  photoIcon,
  plusIcon,
  pointIcon,
  quoteIcon,
  refreshIcon,
  rowInsertBottomIcon,
  rowRemoveIcon,
  searchIcon,
  sendIcon,
  separatorIcon,
  sparklesIcon,
  squareCheckIcon,
  squareIcon,
  strikethroughIcon,
  tableIcon,
  textCaptionIcon,
  uploadIcon,
  xIcon,
} from './tablerIcons';

type Translate = (key: string) => string;

const HEADING_LEVELS = [null, 1, 2, 3, 4, 5, 6] as const;

export function createCrepeFeatureConfig(translate: Translate) {
  const t = (key: string) => translate(`markdownEditor.crepe.${key}`);

  return {
    [CrepeFeature.BlockEdit]: {
      handleAddIcon: plusIcon,
      handleDragIcon: gripVerticalIcon,
      textGroup: {
        label: t('text'),
        text: { label: t('text'), icon: paragraphIcon },
        h1: { label: t('heading1'), icon: headingIcon },
        h2: { label: t('heading2'), icon: headingIcon },
        h3: { label: t('heading3'), icon: headingIcon },
        h4: { label: t('heading4'), icon: headingIcon },
        h5: { label: t('heading5'), icon: headingIcon },
        h6: { label: t('heading6'), icon: headingIcon },
        quote: { label: t('quote'), icon: quoteIcon },
        divider: { label: t('divider'), icon: separatorIcon },
      },
      listGroup: {
        label: t('list'),
        bulletList: { label: t('bulletList'), icon: listIcon },
        orderedList: { label: t('orderedList'), icon: listNumbersIcon },
        taskList: { label: t('taskList'), icon: listCheckIcon },
      },
      advancedGroup: {
        label: t('advanced'),
        image: { label: t('image'), icon: photoIcon },
        codeBlock: { label: t('codeBlock'), icon: codeBlockIcon },
        table: { label: t('table'), icon: tableIcon },
        math: { label: t('math'), icon: mathIcon },
      },
      buildMenu: (builder: any) => {
        buildMentionMenu(builder, translate);
        buildDrawingMenu(builder, translate);
      },
    },
    [CrepeFeature.Toolbar]: {
      boldIcon,
      codeIcon,
      italicIcon,
      linkIcon,
      strikethroughIcon,
      latexIcon: mathIcon,
      aiIcon: sparklesIcon,
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
    [CrepeFeature.ImageBlock]: {
      inlineImageIcon: photoIcon,
      blockImageIcon: photoIcon,
      blockCaptionIcon: textCaptionIcon,
      inlineConfirmButton: checkIcon,
      blockConfirmButton: checkIcon,
      inlineUploadButton: uploadIcon,
      blockUploadButton: uploadIcon,
      inlineOnUpload: uploadStoredFile,
      blockOnUpload: uploadStoredFile,
      proxyDomURL: resolveStoredFileUrl,
    },
    [CrepeFeature.ListItem]: {
      bulletIcon: pointIcon,
      checkBoxCheckedIcon: squareCheckIcon,
      checkBoxUncheckedIcon: squareIcon,
    },
    [CrepeFeature.LinkTooltip]: {
      linkIcon,
      editButton: pencilIcon,
      removeButton: xIcon,
      confirmButton: checkIcon,
    },
    [CrepeFeature.CodeMirror]: {
      expandIcon: chevronDownIcon,
      searchIcon,
      clearSearchIcon: xIcon,
      copyIcon,
      previewToggleIcon: (previewOnlyMode: boolean) =>
        previewOnlyMode ? pencilIcon : eyeOffIcon,
    },
    [CrepeFeature.Latex]: {
      inlineEditConfirm: checkIcon,
    },
    [CrepeFeature.Table]: {
      addRowIcon: rowInsertBottomIcon,
      addColIcon: columnInsertRightIcon,
      deleteRowIcon: rowRemoveIcon,
      deleteColIcon: columnRemoveIcon,
      alignLeftIcon,
      alignCenterIcon,
      alignRightIcon,
      colDragHandleIcon: gripVerticalIcon,
      rowDragHandleIcon: gripHorizontalIcon,
    },
    [CrepeFeature.TopBar]: {
      boldIcon,
      italicIcon,
      strikethroughIcon,
      codeIcon,
      linkIcon,
      imageIcon: photoIcon,
      tableIcon,
      codeBlockIcon,
      mathIcon,
      quoteIcon,
      hrIcon: separatorIcon,
      bulletListIcon: listIcon,
      orderedListIcon: listNumbersIcon,
      taskListIcon: listCheckIcon,
      chevronDownIcon,
    },
    [CrepeFeature.AI]: {
      aiIcon: sparklesIcon,
      sendIcon,
      sendPromptIcon: sendIcon,
      enterKeyIcon: cornerDownLeftIcon,
      chevronLeftIcon,
      chevronRightIcon,
      diffActions: {
        retryIcon: refreshIcon,
        rejectIcon: xIcon,
        acceptIcon: checkIcon,
      },
    },
  };
}
