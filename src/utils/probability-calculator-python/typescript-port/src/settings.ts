export interface Settings {
  RV_TRUNC: boolean;
  RV_IGNORE_ZERO_PROBS: boolean;
  DEFAULT_OUTPUT_WIDTH: number;
  DEFAULT_PRINT_FN: (msg: string) => void;
  INTERNAL_CURR_DEPTH: number;
  INTERNAL_CURR_DEPTH_WARNING_PRINTED: boolean;
  'position order': 'highest first' | 'lowest first';
  'explode depth': number;
  'maximum function depth': number;
}

export const DEFAULT_SETTINGS: Settings = {
  RV_TRUNC: false,
  RV_IGNORE_ZERO_PROBS: false,
  DEFAULT_OUTPUT_WIDTH: 180,
  DEFAULT_PRINT_FN: console.log,
  INTERNAL_CURR_DEPTH: 0,
  INTERNAL_CURR_DEPTH_WARNING_PRINTED: false,
  'position order': 'highest first',
  'explode depth': 2,
  'maximum function depth': 10,
};

export const SETTINGS: Settings = { ...DEFAULT_SETTINGS };

export function settings_set(name: keyof Settings, value: unknown): void {
  if (name === 'position order') {
    if (value !== 'highest first' && value !== 'lowest first') {
      throw new Error('position order must be "highest first" or "lowest first"');
    }
  } else if (name === 'explode depth') {
    if (typeof value !== 'number' || value <= 0) {
      throw new Error(`"explode depth" can only be set to a positive integer (the default is 2) got ${value}`);
    }
  } else if (name === 'maximum function depth') {
    if (typeof value !== 'number' || value <= 0) {
      throw new Error(`"maximum function depth" can only be set to a positive integer (the default is 10) got ${value}`);
    }
  } else if (name === 'RV_TRUNC' || name === 'RV_IGNORE_ZERO_PROBS') {
    if (typeof value === 'string') {
      if (value.toLowerCase() !== 'true' && value.toLowerCase() !== 'false') {
        throw new Error('value must be "True" or "False"');
      }
      value = value.toLowerCase() === 'true';
    }
    if (typeof value !== 'boolean') {
      throw new Error('value must be a boolean');
    }
  } else if (name === 'DEFAULT_OUTPUT_WIDTH') {
    if (typeof value !== 'number' || value <= 0) {
      throw new Error('DEFAULT_OUTPUT_WIDTH must be a positive integer');
    }
  } else if (name === 'DEFAULT_PRINT_FN') {
    if (typeof value !== 'function') {
      throw new Error('DEFAULT_PRINT_FN must be a callable');
    }
  } else {
    throw new Error(`invalid setting name: ${name}`);
  }
  (SETTINGS as Record<string, unknown>)[name] = value;
}

let _resetCallback: (() => void) | null = null;

export function settings_reset(): void {
  Object.assign(SETTINGS, DEFAULT_SETTINGS);
  if (_resetCallback) {
    _resetCallback();
  }
}

export function register_reset_callback(cb: () => void): void {
  _resetCallback = cb;
}