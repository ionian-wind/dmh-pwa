declare module 'virtual:feature-flags' {
  export const features: Record<string, boolean>;
  export const enabledFeatures: string[];
  export function isFeatureEnabled(id: string): boolean;
}

declare module 'virtual:feature-routes' {
  import type { RouteRecordRaw } from 'vue-router';
  export const featureRoutes: RouteRecordRaw[];
}

declare module 'virtual:feature-navigation' {
  import type { FeatureNavEntry } from '@/features/types';
  export const featureNavigation: FeatureNavEntry[];
}

declare module 'virtual:feature-home-cards' {
  import type { FeatureHomeCard } from '@/features/types';
  export const featureHomeCards: FeatureHomeCard[];
}

declare module 'virtual:feature-home-actions' {
  import type { Component } from 'vue';
  export const featureHomeActions: Component[];
}

declare module 'virtual:feature-entity-panels' {
  import type { Component } from 'vue';
  export const entityScenesPanel: Component;
}

declare module 'virtual:feature-globals' {
  import type { Component } from 'vue';
  export const featureGlobals: Component[];
}

declare module 'virtual:feature-links' {
  import type { FeatureLinkKindOption } from '@/features/types';
  export const featureLinkKinds: FeatureLinkKindOption[];
  export const featureLinkIcons: Record<string, any>;
  export const featureDragKinds: string[];
}

declare const __FEATURE_NOTES__: boolean;
declare const __FEATURE_CHARACTERS__: boolean;
declare const __FEATURE_PARTIES__: boolean;
declare const __FEATURE_MONSTERS__: boolean;
declare const __FEATURE_ENCOUNTERS__: boolean;
declare const __FEATURE_MODULES__: boolean;
declare const __FEATURE_MAPS__: boolean;
declare const __FEATURE_JUKEBOX__: boolean;
declare const __FEATURE_AMBIENT__: boolean;
declare const __FEATURE_TIMERS__: boolean;
declare const __FEATURE_CALCULATOR__: boolean;
declare const __FEATURE_PROBABILITY__: boolean;
declare const __FEATURE_HELP__: boolean;
