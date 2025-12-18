export type FrameType =
  | 'calendar'
  | 'photos'
  | 'notes'
  | 'tasks'
  | 'web'
  | 'video'
  | 'music'
  | 'document'
  | 'clock'
  | 'quotes'
  | 'gif';

export interface FrameConfig {
  [key: string]: any;
}

export interface Frame {
  id: string;
  type: FrameType;
  title?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  config: FrameConfig;
}

// Theme types for dashboard customization
export type BackgroundType = 'solid' | 'gradient' | 'image';

export type OverlayEffect = 'none' | 'hearts' | 'balloons' | 'snow' | 'stars' | 'bubbles' | 'leaves' | 'sparkles';

export interface DashboardTheme {
  background: {
    type: BackgroundType;
    value: string;
  };
  font: 'inter' | 'outfit' | 'space-grotesk' | 'playfair' | 'jetbrains-mono';
  widgetStyle: 'solid' | 'glass' | 'transparent';
  accentColor: string;
  overlay?: OverlayEffect;
}

export const DEFAULT_THEME: DashboardTheme = {
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
  },
  font: 'inter',
  widgetStyle: 'glass',
  accentColor: '#3b82f6',
  overlay: 'none'
};

// Multi-page support
export interface DashboardPage {
  id: string;
  name: string;
  icon?: string;
  frames: Frame[];
  order: number;
}

export const createDefaultPage = (name: string = 'Home', order: number = 0): DashboardPage => ({
  id: crypto.randomUUID(),
  name,
  frames: [],
  order
});

export interface DashboardLayout {
  id: string;
  name: string;
  ownerId: string;
  pages: DashboardPage[];
  currentPageIndex: number;
  createdAt: number;
  updatedAt: number;
  cols: number;
  theme?: DashboardTheme;
}

