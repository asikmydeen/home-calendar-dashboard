import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout, Frame, DashboardTheme, DashboardPage, DEFAULT_THEME, createDefaultPage } from '@/types/dashboard';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

// Mock dashboard with pages
const MOCK_DASHBOARD: DashboardLayout = {
  id: 'demo-dashboard',
  name: 'Living Room',
  ownerId: 'user-1',
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
};

export function useDashboard(dashboardId?: string) {
  const [dashboard, setDashboard] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDashboard(MOCK_DASHBOARD);
      setCurrentPageIndex(MOCK_DASHBOARD.currentPageIndex);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [dashboardId]);

  // Get current page
  const currentPage = dashboard?.pages[currentPageIndex] || null;

  // Page navigation
  const goToPage = useCallback((index: number) => {
    if (!dashboard) return;
    const clampedIndex = Math.max(0, Math.min(index, dashboard.pages.length - 1));
    setCurrentPageIndex(clampedIndex);
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

  // Update frames for current page
  const updateFrames = useCallback(async (frames: Frame[]) => {
    setDashboard(prev => {
      if (!prev) return null;
      const updatedPages = [...prev.pages];
      updatedPages[currentPageIndex] = { ...updatedPages[currentPageIndex], frames };
      return { ...prev, pages: updatedPages };
    });
    console.log('Saved layout for page:', currentPageIndex, frames);
  }, [currentPageIndex]);

  // Add frame to current page
  const addFrame = useCallback((type: string) => {
    const newFrame: Frame = {
      id: crypto.randomUUID(),
      type: type as any,
      title: `New ${type}`,
      x: 0,
      y: Infinity,
      w: 4,
      h: 4,
      config: {}
    };

    setDashboard(prev => {
      if (!prev) return null;
      const updatedPages = [...prev.pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        frames: [...updatedPages[currentPageIndex].frames, newFrame]
      };
      return { ...prev, pages: updatedPages };
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
      return { ...prev, pages: updatedPages };
    });
  }, [currentPageIndex]);

  // Update single frame
  const updateFrame = useCallback((updatedFrame: Frame) => {
    setDashboard(prev => {
      if (!prev) return null;
      const updatedPages = [...prev.pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        frames: updatedPages[currentPageIndex].frames.map(f => f.id === updatedFrame.id ? updatedFrame : f)
      };
      return { ...prev, pages: updatedPages };
    });
  }, [currentPageIndex]);

  // Update theme
  const updateTheme = useCallback((theme: DashboardTheme) => {
    setDashboard(prev => prev ? { ...prev, theme } : null);
    console.log('Updated theme:', theme);
  }, []);

  // Page CRUD operations
  const addPage = useCallback((name: string = 'New Page') => {
    setDashboard(prev => {
      if (!prev) return null;
      const newPage = createDefaultPage(name, prev.pages.length);
      return { ...prev, pages: [...prev.pages, newPage] };
    });
  }, []);

  const removePage = useCallback((pageId: string) => {
    setDashboard(prev => {
      if (!prev || prev.pages.length <= 1) return prev; // Keep at least one page
      const newPages = prev.pages.filter(p => p.id !== pageId);
      const newIndex = Math.min(currentPageIndex, newPages.length - 1);
      setCurrentPageIndex(newIndex);
      return { ...prev, pages: newPages, currentPageIndex: newIndex };
    });
  }, [currentPageIndex]);

  const updatePage = useCallback((pageId: string, updates: Partial<DashboardPage>) => {
    setDashboard(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(p => p.id === pageId ? { ...p, ...updates } : p)
      };
    });
  }, []);

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
    addFrame,
    removeFrame,
    updateFrame,
    // Theme
    updateTheme,
    // Page operations
    addPage,
    removePage,
    updatePage
  };
}


