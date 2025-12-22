'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout, Frame, DashboardTheme, DashboardPage, DEFAULT_THEME, createDefaultPage, BreakpointLayouts } from '@/types/dashboard';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

// Storage keys
const DASHBOARD_STORAGE_KEY = 'home-dashboard-layout';
const CURRENT_PAGE_KEY = 'home-dashboard-current-page';

// Default dashboard for new users
const createDefaultDashboard = (): DashboardLayout => ({
  id: 'default-dashboard',
  name: 'Home Dashboard',
  ownerId: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  cols: 12,
  currentPageIndex: 0,
  theme: DEFAULT_THEME,
  pages: [
    {
      id: 'page-1',
      name: 'Home',
      order: 0,
      frames: [
        { id: '1', type: 'clock', title: 'Time', x: 0, y: 0, w: 4, h: 4, config: { style: 'neon' } },
        { id: '2', type: 'notes', title: 'Reminders', x: 4, y: 0, w: 4, h: 4, config: {} },
        { id: '3', type: 'photos', title: 'Family Album', x: 8, y: 0, w: 4, h: 6, config: {} },
      ]
    },
    {
      id: 'page-2',
      name: 'Calendar',
      order: 1,
      frames: [
        { id: '4', type: 'calendar', title: 'Schedule', x: 0, y: 0, w: 8, h: 6, config: {} },
        { id: '5', type: 'tasks', title: 'To-Do', x: 8, y: 0, w: 4, h: 6, config: {} },
      ]
    },
    {
      id: 'page-3',
      name: 'Media',
      order: 2,
      frames: []
    }
  ]
});

/**
 * Load dashboard from localStorage
 */
function loadFromLocalStorage(): DashboardLayout | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate basic structure
      if (parsed && parsed.pages && Array.isArray(parsed.pages)) {
        return parsed as DashboardLayout;
      }
    }
  } catch (e) {
    console.error('Error loading dashboard from localStorage:', e);
  }
  return null;
}

/**
 * Save dashboard to localStorage
 */
function saveToLocalStorage(dashboard: DashboardLayout) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(dashboard));
    console.log('Dashboard saved to localStorage');
  } catch (e) {
    console.error('Error saving dashboard to localStorage:', e);
  }
}

/**
 * Save current page index to localStorage
 */
function saveCurrentPageIndex(index: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_PAGE_KEY, index.toString());
}

/**
 * Load current page index from localStorage
 */
function loadCurrentPageIndex(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(CURRENT_PAGE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

export function useDashboard(dashboardId?: string) {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Debounce timer ref
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load dashboard on mount
  useEffect(() => {
    const loadDashboard = () => {
      // Try localStorage first
      const stored = loadFromLocalStorage();

      if (stored) {
        setDashboard(stored);
        const savedPageIndex = loadCurrentPageIndex();
        setCurrentPageIndex(Math.min(savedPageIndex, stored.pages.length - 1));
      } else {
        // Create default dashboard
        const defaultDashboard = createDefaultDashboard();
        if (user) {
          defaultDashboard.ownerId = user.uid;
        }
        setDashboard(defaultDashboard);
        saveToLocalStorage(defaultDashboard);
      }

      setLoading(false);
    };

    // Small delay to ensure client-side hydration
    const timer = setTimeout(loadDashboard, 100);
    return () => clearTimeout(timer);
  }, [user]);

  // Save dashboard whenever it changes (debounced)
  useEffect(() => {
    if (!dashboard) return;

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce save by 500ms
    saveTimerRef.current = setTimeout(() => {
      saveToLocalStorage(dashboard);
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [dashboard]);

  // Get current page
  const currentPage = dashboard?.pages[currentPageIndex] || null;

  // Page navigation
  const goToPage = useCallback((index: number) => {
    if (!dashboard) return;
    const clampedIndex = Math.max(0, Math.min(index, dashboard.pages.length - 1));
    setCurrentPageIndex(clampedIndex);
    saveCurrentPageIndex(clampedIndex);
    setDashboard(prev => prev ? { ...prev, currentPageIndex: clampedIndex } : null);
  }, [dashboard]);

  const nextPage = useCallback(() => {
    if (!dashboard) return;
    goToPage(currentPageIndex + 1);
  }, [dashboard, currentPageIndex, goToPage]);

  const prevPage = useCallback(() => {
    if (!dashboard) return;
    goToPage(currentPageIndex - 1);
  }, [dashboard, currentPageIndex, goToPage]);

  // Update frames for current page (including layout changes)
  const updateFrames = useCallback(async (frames: Frame[]) => {
    setDashboard(prev => {
      if (!prev) return null;
      const updatedPages = [...prev.pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        frames
      };
      const updated = {
        ...prev,
        pages: updatedPages,
        updatedAt: Date.now()
      };
      return updated;
    });
  }, [currentPageIndex]);

  // Update frames with breakpoint-specific layouts
  const updateFramesWithLayouts = useCallback((frames: Frame[], breakpoint: string) => {
    setDashboard(prev => {
      if (!prev) return null;

      // Update frames with breakpoint-specific layout data
      const updatedFrames = frames.map(frame => {
        const currentLayouts = frame.layouts || {};
        return {
          ...frame,
          layouts: {
            ...currentLayouts,
            [breakpoint]: { x: frame.x, y: frame.y, w: frame.w, h: frame.h }
          }
        };
      });

      const updatedPages = [...prev.pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        frames: updatedFrames
      };

      return {
        ...prev,
        pages: updatedPages,
        updatedAt: Date.now()
      };
    });
  }, [currentPageIndex]);

  // Get default dimensions and constraints for each widget type
  const getWidgetDefaults = (type: string): { w: number; h: number; minW: number; minH: number } => {
    switch (type) {
      case 'calendar':
        return { w: 6, h: 6, minW: 4, minH: 4 };
      case 'clock':
        return { w: 4, h: 3, minW: 2, minH: 2 };
      case 'photos':
        return { w: 4, h: 4, minW: 2, minH: 2 };
      case 'notes':
        return { w: 4, h: 4, minW: 2, minH: 2 };
      case 'tasks':
        return { w: 4, h: 5, minW: 3, minH: 3 };
      case 'quotes':
        return { w: 4, h: 3, minW: 2, minH: 2 }; // Allow small height
      case 'gif':
        return { w: 3, h: 3, minW: 2, minH: 2 };
      case 'web':
        return { w: 6, h: 5, minW: 3, minH: 3 };
      case 'music':
        return { w: 4, h: 4, minW: 2, minH: 3 };
      case 'video':
        return { w: 6, h: 4, minW: 4, minH: 3 };
      default:
        return { w: 4, h: 4, minW: 2, minH: 2 };
    }
  };

  // Add frame to current page
  const addFrame = useCallback((type: string) => {
    setDashboard(prev => {
      if (!prev) return null;

      const defaults = getWidgetDefaults(type);

      // Always place new modules at (0, 0) - top-left corner
      // This ensures they're ALWAYS visible and the user can move them
      // Overlapping is allowed, user will resize/reposition as needed
      const newFrame: Frame = {
        id: crypto.randomUUID(),
        type: type as Frame['type'],
        title: `New ${type}`,
        x: 0,
        y: 0,
        w: defaults.w,
        h: defaults.h,
        minW: defaults.minW,
        minH: defaults.minH,
        config: {},
        layouts: {}
      };

      const updatedPages = [...prev.pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        frames: [...updatedPages[currentPageIndex].frames, newFrame]
      };
      return { ...prev, pages: updatedPages, updatedAt: Date.now() };
    });
  }, [currentPageIndex]);

  // Remove frame from current page
  const removeFrame = useCallback((id: string) => {
    setDashboard(prev => {
      if (!prev) return null;
      const updatedPages = [...prev.pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        frames: updatedPages[currentPageIndex].frames.filter(f => f.id !== id)
      };
      return { ...prev, pages: updatedPages, updatedAt: Date.now() };
    });
  }, [currentPageIndex]);

  // Update single frame
  const updateFrame = useCallback((updatedFrame: Frame) => {
    setDashboard(prev => {
      if (!prev) return null;
      const updatedPages = [...prev.pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        frames: updatedPages[currentPageIndex].frames.map(f =>
          f.id === updatedFrame.id ? updatedFrame : f
        )
      };
      return { ...prev, pages: updatedPages, updatedAt: Date.now() };
    });
  }, [currentPageIndex]);

  // Update theme
  const updateTheme = useCallback((theme: DashboardTheme) => {
    setDashboard(prev => prev ? { ...prev, theme, updatedAt: Date.now() } : null);
  }, []);

  // Page CRUD operations
  const addPage = useCallback((name: string = 'New Page') => {
    setDashboard(prev => {
      if (!prev) return null;
      const newPage = createDefaultPage(name, prev.pages.length);
      return { ...prev, pages: [...prev.pages, newPage], updatedAt: Date.now() };
    });
  }, []);

  const removePage = useCallback((pageId: string) => {
    setDashboard(prev => {
      if (!prev || prev.pages.length <= 1) return prev; // Keep at least one page
      const newPages = prev.pages.filter(p => p.id !== pageId);
      const newIndex = Math.min(currentPageIndex, newPages.length - 1);
      setCurrentPageIndex(newIndex);
      saveCurrentPageIndex(newIndex);
      return { ...prev, pages: newPages, currentPageIndex: newIndex, updatedAt: Date.now() };
    });
  }, [currentPageIndex]);

  const updatePage = useCallback((pageId: string, updates: Partial<DashboardPage>) => {
    setDashboard(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(p => p.id === pageId ? { ...p, ...updates } : p),
        updatedAt: Date.now()
      };
    });
  }, []);

  // Move a frame from current page to a target page
  const moveFrameToPage = useCallback((frameId: string, targetPageIndex: number) => {
    if (targetPageIndex === currentPageIndex) return; // Already on this page

    setDashboard(prev => {
      if (!prev) return null;
      if (targetPageIndex < 0 || targetPageIndex >= prev.pages.length) return prev;

      // Find the frame in current page
      const frame = prev.pages[currentPageIndex].frames.find(f => f.id === frameId);
      if (!frame) return prev;

      // Calculate new position for the target page (find bottom of existing widgets)
      const targetPageFrames = prev.pages[targetPageIndex].frames;
      let maxBottomY = 0;
      targetPageFrames.forEach(f => {
        const bottomY = f.y + f.h;
        if (bottomY > maxBottomY) maxBottomY = bottomY;
      });

      // Create moved frame with new position
      const movedFrame: Frame = {
        ...frame,
        x: 0,
        y: maxBottomY,
        layouts: {} // Reset breakpoint layouts for new page
      };

      // Update pages: remove from current, add to target
      const updatedPages = prev.pages.map((page, idx) => {
        if (idx === currentPageIndex) {
          // Remove from current page
          return {
            ...page,
            frames: page.frames.filter(f => f.id !== frameId)
          };
        }
        if (idx === targetPageIndex) {
          // Add to target page
          return {
            ...page,
            frames: [...page.frames, movedFrame]
          };
        }
        return page;
      });

      return {
        ...prev,
        pages: updatedPages,
        updatedAt: Date.now()
      };
    });

    // Navigate to the target page
    goToPage(targetPageIndex);
  }, [currentPageIndex, goToPage]);

  // Reset dashboard to default
  const resetDashboard = useCallback(() => {
    const defaultDashboard = createDefaultDashboard();
    if (user) {
      defaultDashboard.ownerId = user.uid;
    }
    setDashboard(defaultDashboard);
    setCurrentPageIndex(0);
    saveCurrentPageIndex(0);
    saveToLocalStorage(defaultDashboard);
  }, [user]);

  return {
    dashboard,
    loading,
    error,
    currentPage,
    currentPageIndex,
    totalPages: dashboard?.pages.length || 0,
    // Navigation
    goToPage,
    nextPage,
    prevPage,
    // Frame operations (current page)
    updateFrames,
    updateFramesWithLayouts,
    addFrame,
    removeFrame,
    updateFrame,
    // Theme
    updateTheme,
    // Page operations
    addPage,
    removePage,
    updatePage,
    moveFrameToPage,
    // Dashboard management
    resetDashboard
  };
}
