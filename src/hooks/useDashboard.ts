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
  const { user, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Debounce timer ref
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load dashboard on mount / auth change
  useEffect(() => {
    if (authLoading) return;

    let unsubscribe: (() => void) | null = null;

    const initDashboard = async () => {
      setLoading(true);

      if (user) {
        // --- Authenticated Mode: Firestore ---
        const dashboardRef = doc(db, 'dashboards', user.uid);

        unsubscribe = onSnapshot(dashboardRef, async (docSnap) => {
          if (docSnap.exists()) {
            // Dashboard exists in Firestore
            const data = docSnap.data() as DashboardLayout;
            setDashboard(data);

            // Restore current page index from local preference if possible, otherwise 0
            const savedPageIndex = loadCurrentPageIndex();
            setCurrentPageIndex(Math.min(savedPageIndex, data.pages.length - 1));
          } else {
            // Dashboard does NOT exist in Firestore
            // Check for local data to migrate
            const localData = loadFromLocalStorage();
            let initialDashboard: DashboardLayout;

            if (localData) {
              // MIGRATION: Use local data
              initialDashboard = { ...localData, ownerId: user.uid, updatedAt: Date.now() };
              console.log('Migrating local dashboard to Firestore...');
            } else {
              // Create default
              initialDashboard = createDefaultDashboard();
              initialDashboard.ownerId = user.uid;
            }

            // Save to Firestore
            try {
              await setDoc(dashboardRef, initialDashboard);
              // The onSnapshot will fire again with this data, so we don't strictly need to setDashboard here,
              // but it feels more responsive to do so if we weren't depending on the listener immediate callback.
              // However, Firestore listeners usually fire immediately with local pending writes.
            } catch (err) {
              console.error("Error creating initial dashboard in Firestore:", err);
              setError("Failed to create dashboard.");
            }
          }
          setLoading(false);
        }, (err) => {
          console.error("Firestore subscription error:", err);
          setError(err.message);
          setLoading(false);
        });

      } else {
        // --- Guest Mode: LocalStorage ---
        const stored = loadFromLocalStorage();
        if (stored) {
          setDashboard(stored);
          const savedPageIndex = loadCurrentPageIndex();
          setCurrentPageIndex(Math.min(savedPageIndex, stored.pages.length - 1));
        } else {
          const defaultDashboard = createDefaultDashboard();
          setDashboard(defaultDashboard);
          saveToLocalStorage(defaultDashboard);
        }
        setLoading(false);
      }
    };

    initDashboard();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, authLoading]);

  // Save dashboard whenever it changes (debounced)
  useEffect(() => {
    if (!dashboard || loading) return;

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce save by 500ms
    saveTimerRef.current = setTimeout(async () => {
      if (user) {
        // Save to Firestore
        try {
          const dashboardRef = doc(db, 'dashboards', user.uid);
          // We use setDoc with merge or just overwrite. Since we hold the whole state, overwrite is safer for consistency
          // unless we want to patch partials. For now, full overwrite is fine for this app scale.
          await setDoc(dashboardRef, {
            ...dashboard,
            updatedAt: Date.now()
          });
        } catch (err) {
          console.error("Error saving to Firestore:", err);
        }
      } else {
        // Save to LocalStorage
        saveToLocalStorage(dashboard);
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [dashboard, user, loading]);

  // Get current page
  const currentPage = dashboard?.pages[currentPageIndex] || null;

  // Page navigation
  const goToPage = useCallback((index: number) => {
    if (!dashboard) return;
    const clampedIndex = Math.max(0, Math.min(index, dashboard.pages.length - 1));
    setCurrentPageIndex(clampedIndex);
    saveCurrentPageIndex(clampedIndex);
    // Note: We don't save page index to Firestore as it's a transient UI state usually 
    // unless we want it synchronized across devices. For now, keeping it local.
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
      return {
        ...prev,
        pages: updatedPages,
        updatedAt: Date.now()
      };
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

      // Update local state navigation immediately for better UX
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

      // Calculate new position for the target page
      const targetPageFrames = prev.pages[targetPageIndex].frames;
      let maxBottomY = 0;
      targetPageFrames.forEach(f => {
        const bottomY = f.y + f.h;
        if (bottomY > maxBottomY) maxBottomY = bottomY;
      });

      // Create moved frame
      const movedFrame: Frame = {
        ...frame,
        x: 0,
        y: maxBottomY,
        layouts: {} // Reset breakpoint layouts for new page
      };

      // Update pages
      const updatedPages = prev.pages.map((page, idx) => {
        if (idx === currentPageIndex) {
          return {
            ...page,
            frames: page.frames.filter(f => f.id !== frameId)
          };
        }
        if (idx === targetPageIndex) {
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

  // Reset dashboard
  const resetDashboard = useCallback(async () => {
    const defaultDashboard = createDefaultDashboard();
    if (user) {
      defaultDashboard.ownerId = user.uid;
      // In Firestore mode, we'll let the debounce or an explicit setDoc handle this
      setDashboard(defaultDashboard);
    } else {
      setDashboard(defaultDashboard);
      saveToLocalStorage(defaultDashboard);
    }
    setCurrentPageIndex(0);
    saveCurrentPageIndex(0);
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
    // Frame operations
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
