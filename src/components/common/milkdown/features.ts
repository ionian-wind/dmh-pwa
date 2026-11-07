import { CrepeFeature } from '@milkdown/crepe';

/**
 * Crepe features that are safe to disable in read-only rendering. These are
 * UI-only: they do not contribute schema nodes or marks, so parsing and
 * serialization stay identical to the editor.
 */
export const READONLY_CREPE_FEATURES = {
  [CrepeFeature.Toolbar]: false,
  [CrepeFeature.BlockEdit]: false,
  [CrepeFeature.Placeholder]: false,
  [CrepeFeature.LinkTooltip]: false,
  [CrepeFeature.Cursor]: false,
  [CrepeFeature.TopBar]: false,
  [CrepeFeature.AI]: false,
};
