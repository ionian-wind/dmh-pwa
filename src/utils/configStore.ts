import { defineStore } from 'pinia';
import { type Ref, ref, watch } from 'vue';
import { debug } from './debug';

const wrapKey = (key: string) => `dmh-config:${key}`;

const getValue = (key: string, def: unknown = null) => {
  const value = localStorage.getItem(wrapKey(key));
  const result = value ? JSON.parse(value) : def;

  debug('configStore - getValue', key, result);

  return result;
};

const removeValue = (key: string) => {
  debug('configStore - removeValue', key);

  localStorage.removeItem(wrapKey(key));
};

const setValue = (key: string, value: unknown) => {
  if (typeof value === 'undefined') {
    return removeValue(key);
  }

  debug('configStore - setValue', key, value);

  return localStorage.setItem(wrapKey(key), JSON.stringify(value));
};

export enum JukeboxRepeatMode {
  off = 'off',
  list = 'list',
  track = 'track',
}

export type UiTheme = 'light' | 'dark' | 'auto';

const UI_THEMES: UiTheme[] = ['light', 'dark', 'auto'];

function readUiTheme(): UiTheme {
  const stored = getValue('uiTheme', 'light');
  return UI_THEMES.includes(stored) ? stored : 'light';
}

function readNavigationGroupsExpanded(): Record<string, boolean> {
  const stored = getValue('navigationGroupsExpanded', {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(stored).filter(
      ([, expanded]) => typeof expanded === 'boolean',
    ),
  ) as Record<string, boolean>;
}

export type ConfigStore = {
  uiTheme: Ref<UiTheme>;
  jukeboxLastTrackId: Ref<string | null>;
  jukeboxLastPlaylistId: Ref<string | null>;
  jukeboxLastTrackProgress: Ref<number>;
  jukeboxLastVolume: Ref<number>;
  jukeboxActivePlaylistId: Ref<string | null>;
  jukeboxRepeatMode: Ref<JukeboxRepeatMode>;
  jukeboxShuffle: Ref<boolean>;
  jukeboxSmoothTrackChange: Ref<boolean>;
  jukeboxAnimatePlayerBackground: Ref<boolean>;
  jukeboxDisplayCoverWhilePlaying: Ref<boolean>;
  jukeboxUseMiniPlayer: Ref<boolean>;
  expandMenu: Ref<boolean>;
  confirmDelete: Ref<boolean>;
  backupIncludeExternalFiles: Ref<boolean>;
  savedLanguage: Ref<string>;
  navigationGroupsExpanded: Ref<Record<string, boolean>>;
};

export const useConfigStore = defineStore<'config', ConfigStore>(
  'config',
  (): ConfigStore => {
    // Define your state here
    const uiTheme = ref<UiTheme>(readUiTheme());
    const jukeboxLastTrackId = ref<string | null>(
      getValue('jukeboxLastTrackId', null),
    );
    const jukeboxLastPlaylistId = ref<string | null>(
      getValue('jukeboxLastPlaylistId', null),
    );
    const jukeboxLastTrackProgress = ref<number>(
      getValue('jukeboxLastTrackProgress', 0),
    );
    const jukeboxLastVolume = ref<number>(getValue('jukeboxLastVolume', 1));
    const jukeboxActivePlaylistId = ref<string | null>(
      getValue('jukeboxActivePlaylistId', null),
    );
    const jukeboxRepeatMode = ref<JukeboxRepeatMode>(
      getValue('jukeboxRepeatMode', JukeboxRepeatMode.off),
    );
    const jukeboxShuffle = ref<boolean>(getValue('jukeboxShuffle', false));
    const jukeboxSmoothTrackChange = ref<boolean>(
      getValue('jukeboxSmoothTrackChange', false),
    );
    const jukeboxAnimatePlayerBackground = ref<boolean>(
      getValue('jukeboxAnimatePlayerBackground', true),
    );
    const jukeboxDisplayCoverWhilePlaying = ref<boolean>(
      getValue('jukeboxDisplayCoverWhilePlaying', true),
    );
    const jukeboxUseMiniPlayer = ref<boolean>(
      getValue('jukeboxUseMiniPlayer', true),
    );
    const expandMenu = ref<boolean>(getValue('expandMenu', true));
    const confirmDelete = ref<boolean>(getValue('confirmDelete', true));
    const backupIncludeExternalFiles = ref<boolean>(
      getValue('backupIncludeExternalFiles', false),
    );
    const browserLanguage = window?.navigator?.language ?? 'en';
    const savedLanguage = ref<string>(
      getValue(
        'savedLanguage',
        browserLanguage.toLowerCase().startsWith('ru') ? 'ru' : 'en',
      ),
    );
    const navigationGroupsExpanded = ref<Record<string, boolean>>(
      readNavigationGroupsExpanded(),
    );

    const config: ConfigStore = {
      uiTheme,
      jukeboxLastTrackId,
      jukeboxLastPlaylistId,
      jukeboxLastTrackProgress,
      jukeboxLastVolume,
      jukeboxActivePlaylistId,
      jukeboxRepeatMode,
      jukeboxShuffle,
      jukeboxSmoothTrackChange,
      jukeboxAnimatePlayerBackground,
      jukeboxDisplayCoverWhilePlaying,
      jukeboxUseMiniPlayer,
      expandMenu,
      confirmDelete,
      backupIncludeExternalFiles,
      savedLanguage,
      navigationGroupsExpanded,
    };

    Object.keys(config).forEach((key: string) => {
      watch(config[key as keyof ConfigStore], (value) => setValue(key, value));
    });

    debug('configStore', config);

    return config;
  },
);
