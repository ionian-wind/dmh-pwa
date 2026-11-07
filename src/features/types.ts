import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

export type FeatureId =
  | 'notes'
  | 'characters'
  | 'parties'
  | 'monsters'
  | 'encounters'
  | 'modules'
  | 'maps'
  | 'jukebox'
  | 'ambient'
  | 'timers'
  | 'calculator'
  | 'probability'
  | 'help';

export interface FeatureNavRoute {
  type: 'route';
  id: string;
  labelKey: string;
  path: string;
  icon: Component;
  kind: 'entity' | 'tool';
  placement: 'primary' | 'tools' | 'footer';
  activePathPrefixes?: string[];
}

export interface FeatureNavComponent {
  type: 'component';
  id: string;
  component: Component;
  kind: 'tool';
  placement: 'primary' | 'tools' | 'footer';
  activePathPrefixes?: string[];
}

export type FeatureNavEntry = FeatureNavRoute | FeatureNavComponent;

export interface FeatureLinkKindOption {
  kind: string;
  labelKey: string;
  icon: Component;
  titleField: 'title' | 'name';
  route: (id: string) => string;
  editor?: () => Promise<Component>;
  create?: (payload: any) => Promise<{ id: string; label: string } | null>;
  useStore: () => {
    items: any;
    load: () => Promise<unknown>;
    getById?: (id: string) => any;
  };
}

export interface FeatureHomeCard {
  id: string;
  titleKey: string;
  route: string;
  icon: string;
  count: () => number;
  load: () => Promise<void>;
}

export interface FeatureIntegration {
  id: FeatureId;
  routes: RouteRecordRaw[];
  navigation: FeatureNavEntry[];
  homeCard?: FeatureHomeCard;
  homeActions?: Component[];
  entityScenesPanel?: Component;
  globalComponents: Component[];
  linkKinds: FeatureLinkKindOption[];
  dragKinds: string[];
}
