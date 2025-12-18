'use client';

import { useState, useEffect } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { Pencil, Save, Plus, LogOut, Settings, Layers } from 'lucide-react';
import { Frame, FrameType, DashboardTheme, DashboardPage, DEFAULT_THEME } from '@/types/dashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const DashboardGrid = dynamic(() => import('@/components/dashboard/DashboardGrid'), { ssr: false });
const FrameSettingsModal = dynamic(() => import('@/components/dashboard/FrameSettingsModal'), { ssr: false });
const DashboardSettings = dynamic(() => import('@/components/dashboard/DashboardSettings'), { ssr: false });
const PageCarousel = dynamic(() => import('@/components/dashboard/PageCarousel'), { ssr: false });
const PageIndicator = dynamic(() => import('@/components/dashboard/PageIndicator'), { ssr: false });
const PageSettings = dynamic(() => import('@/components/dashboard/PageSettings'), { ssr: false });
const VisualOverlay = dynamic(() => import('@/components/effects/VisualOverlay'), { ssr: false });

const FONT_CLASSES: Record<string, string> = {
  'inter': 'font-sans',
  'outfit': 'font-sans',
  'space-grotesk': 'font-sans',
  'playfair': 'font-serif',
  'jetbrains-mono': 'font-mono',
};

export default function Home() {
  const user = { uid: 'test' };
  const authLoading = false;
  const logout = () => { };

  const {
    dashboard,
    loading: dashboardLoading,
    currentPage,
    currentPageIndex,
    totalPages,
    goToPage,
    updateFrames,
    addFrame,
    removeFrame,
    updateFrame,
    updateTheme,
    addPage,
    removePage,
    updatePage
  } = useDashboard('demo');

  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingFrame, setEditingFrame] = useState<Frame | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPageSettings, setShowPageSettings] = useState(false);
  const router = useRouter();

  const theme = dashboard?.theme || DEFAULT_THEME;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || (dashboardLoading && user)) return null;
  if (!user || !dashboard) return null;

  const handleAddFrame = (type: FrameType) => {
    addFrame(type);
    setShowAddMenu(false);
  };

  const handleEditFrame = (id: string) => {
    const frame = currentPage?.frames.find(f => f.id === id);
    if (frame) {
      setEditingFrame(frame);
    }
  };

  const handleSaveFrame = (updatedFrame: Frame) => {
    updateFrame(updatedFrame);
    setEditingFrame(null);
  };

  const handleSaveTheme = (newTheme: DashboardTheme) => {
    updateTheme(newTheme);
  };

  const backgroundStyle = theme.background.type === 'image'
    ? { backgroundImage: `url(${theme.background.value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
    : { background: theme.background.value };

  return (
    <main
      className={`h-screen w-screen text-white relative overflow-hidden ${FONT_CLASSES[theme.font] || 'font-sans'}`}
      style={backgroundStyle}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Visual Effects Overlay */}
      {theme.overlay && theme.overlay !== 'none' && (
        <VisualOverlay effect={theme.overlay} />
      )}

      {/* Top Bar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {isEditMode && (
          <>
            {/* Pages Button */}
            <button
              onClick={() => setShowPageSettings(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-full shadow-lg transition-all border border-white/20"
              title="Manage Pages"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden md:inline">{currentPage?.name || 'Page'}</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-full shadow-lg transition-all border border-white/20"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Add Widget */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Widget</span>
              </button>

              {showAddMenu && (
                <div className="absolute top-12 right-0 w-56 bg-zinc-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-2 grid gap-1 max-h-80 overflow-y-auto">
                  {[
                    { type: 'calendar', emoji: '📅' },
                    { type: 'clock', emoji: '🕐' },
                    { type: 'photos', emoji: '📷' },
                    { type: 'notes', emoji: '📝' },
                    { type: 'tasks', emoji: '✅' },
                    { type: 'quotes', emoji: '💬' },
                    { type: 'gif', emoji: '🎬' },
                    { type: 'web', emoji: '🌐' },
                    { type: 'music', emoji: '🎵' },
                    { type: 'video', emoji: '📹' },
                  ].map(({ type, emoji }) => (
                    <button
                      key={type}
                      onClick={() => handleAddFrame(type as FrameType)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/90 flex items-center gap-2"
                    >
                      <span>{emoji}</span>
                      <span className="capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all backdrop-blur-md ${isEditMode
            ? 'bg-green-500/90 hover:bg-green-600 text-white'
            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
        >
          {isEditMode ? (
            <>
              <Save className="w-4 h-4" />
              <span>Done</span>
            </>
          ) : (
            <>
              <Pencil className="w-4 h-4" />
              <span>Edit</span>
            </>
          )}
        </button>

        {isEditMode && (
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/20 backdrop-blur-md text-red-300 hover:bg-red-500/30 rounded-full shadow-lg transition-colors border border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Page Carousel */}
      <PageCarousel
        pages={dashboard.pages}
        currentPageIndex={currentPageIndex}
        onPageChange={goToPage}
      >
        {(page: DashboardPage, index: number) => (
          <div className="h-full w-full p-4 md:p-8 overflow-y-auto">
            {/* Page Title */}
            <h1 className="text-3xl font-light mb-6 text-white/50 select-none drop-shadow-lg">
              {page.name}
            </h1>

            {/* Widgets or Empty State */}
            {page.frames.length > 0 ? (
              <DashboardGrid
                frames={page.frames}
                isEditMode={isEditMode}
                onLayoutChange={updateFrames}
                onRemoveFrame={removeFrame}
                onEditFrame={handleEditFrame}
                widgetStyle={theme.widgetStyle}
              />
            ) : (
              <div className="empty-page-placeholder">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-xl">Empty page</p>
                <p className="text-sm mt-2 opacity-60">
                  {isEditMode ? 'Click "Add Widget" to add content' : 'Enter edit mode to add widgets'}
                </p>
              </div>
            )}
          </div>
        )}
      </PageCarousel>

      {/* Page Indicator */}
      <PageIndicator
        pages={dashboard.pages}
        currentIndex={currentPageIndex}
        onPageSelect={goToPage}
        isEditMode={isEditMode}
      />

      {/* Frame Settings Modal */}
      <FrameSettingsModal
        frame={editingFrame}
        isOpen={!!editingFrame}
        onClose={() => setEditingFrame(null)}
        onSave={handleSaveFrame}
      />

      {/* Dashboard Settings Modal */}
      <DashboardSettings
        dashboard={dashboard}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveTheme}
      />

      {/* Page Settings Modal */}
      <PageSettings
        pages={dashboard.pages}
        currentPageIndex={currentPageIndex}
        isOpen={showPageSettings}
        onClose={() => setShowPageSettings(false)}
        onAddPage={addPage}
        onRemovePage={removePage}
        onUpdatePage={updatePage}
        onGoToPage={goToPage}
      />
    </main>
  );
}