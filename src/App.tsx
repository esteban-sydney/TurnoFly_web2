import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Splash } from './components/Splash';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { HomeDashboard } from './components/HomeDashboard';
import { ShiftAnalyzer } from './components/ShiftAnalyzer';
import { PersonalCalendar } from './components/PersonalCalendar';
import { SupervisorView } from './components/SupervisorView';
import { ExcelImportModal } from './components/ExcelImportModal';
import { EvidenceModal } from './components/EvidenceModal';
import { SettingsModal } from './components/SettingsModal';
import { ShareImageModal } from './components/ShareImageModal';
import { Trash2, RotateCcw, Home, Calendar, Clock, Users, LoaderCircle } from 'lucide-react';
import { getTranslation } from './utils/i18n';
import { buttonMotion } from './utils/motionVariants';

function AppMain() {
  const { signOut } = useAuth();
  const {
    settings,
    clearShiftsOnly,
    resetFullApp,
    setUserRole,
    workers,
    availableShiftPeriods,
    setActiveYearMonth,
    setLastActiveView,
  } = useApp();
  const lang = settings.language;

  const canOpenSupervisor = workers.some((w) => Object.keys(w.shifts || {}).length > 0);

  // View Navigation State
  const [activeView, setActiveViewState] = useState<'home' | 'shifts' | 'personal' | 'supervisor'>(() => {
    const initial = settings.activeView || 'home';
    return initial === 'supervisor' && !canOpenSupervisor ? 'home' : initial;
  });
  const [focusedPersonalEventId, setFocusedPersonalEventId] = useState<string | null>(null);

  const focusShiftsOnToday = () => {
    const today = new Date();
    const currentPeriod = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    };
    const exactPeriod = availableShiftPeriods.find(
      (period) => period.year === currentPeriod.year && period.month === currentPeriod.month
    );
    const targetPeriod =
      exactPeriod ||
      availableShiftPeriods.reduce<(typeof availableShiftPeriods)[number] | undefined>(
        (nearest, period) => {
          if (!nearest) return period;

          const currentValue = currentPeriod.year * 12 + currentPeriod.month;
          const nearestDistance = Math.abs(nearest.year * 12 + nearest.month - currentValue);
          const periodDistance = Math.abs(period.year * 12 + period.month - currentValue);
          return periodDistance < nearestDistance ? period : nearest;
        },
        undefined
      ) || currentPeriod;

    setActiveYearMonth(targetPeriod.year, targetPeriod.month);
  };

  const setActiveView = (view: 'home' | 'shifts' | 'personal' | 'supervisor') => {
    const nextView = view === 'supervisor' && !canOpenSupervisor ? 'home' : view;
    if (nextView === 'shifts') {
      focusShiftsOnToday();
    }
    if (nextView === 'supervisor') {
      setUserRole('supervisor');
    } else if (settings.userRole === 'supervisor') {
      setUserRole('worker');
    }
    setActiveViewState(nextView);
    setLastActiveView(nextView);
  };

  const openPersonalEvent = (eventId: string) => {
    setFocusedPersonalEventId(eventId);
    setActiveView('personal');
  };

  useEffect(() => {
    const nextView = settings.activeView || 'home';
    const safeView = nextView === 'supervisor' && !canOpenSupervisor ? 'home' : nextView;
    setActiveViewState(safeView);
  }, [settings.activeView, canOpenSupervisor]);

  useEffect(() => {
    if (activeView === 'shifts') {
      focusShiftsOnToday();
    }
  }, []);

  useEffect(() => {
    if (!canOpenSupervisor && activeView === 'supervisor') {
      setActiveView('home');
    }
  }, [canOpenSupervisor, activeView]);

  // Modal States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Confirmation Dialog States
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [showResetAnimation, setShowResetAnimation] = useState(false);

  const handleResetFullApp = () => {
    resetFullApp();
    setShowResetAnimation(true);
    setConfirmResetOpen(false);
    setActiveView('home');

    window.setTimeout(() => {
      setShowResetAnimation(false);
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans overflow-x-hidden w-full">
      
      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        disableSupervisor={!canOpenSupervisor}
        onSignOut={signOut}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-24 w-full max-w-full overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {activeView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <HomeDashboard
                onOpenImport={() => setIsImportOpen(true)}
                onOpenPersonalEvent={openPersonalEvent}
                setActiveView={setActiveView}
                onConfirmClearShifts={() => setConfirmClearOpen(true)}
                onConfirmResetApp={() => setConfirmResetOpen(true)}
              />
            </motion.div>
          )}

          {activeView === 'shifts' && (
            <motion.div
              key="shifts"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <ShiftAnalyzer onOpenShareModal={() => setIsShareModalOpen(true)} />
            </motion.div>
          )}

          {activeView === 'personal' && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <PersonalCalendar
                focusedEventId={focusedPersonalEventId}
                onFocusedEventHandled={() => setFocusedPersonalEventId(null)}
              />
            </motion.div>
          )}

          {activeView === 'supervisor' && (
            <motion.div
              key="supervisor"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <SupervisorView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Bottom Navigation Bar for Instant Fluid Navigation */}
      <nav className="app-safe-nav fixed bottom-0 left-0 right-0 z-40 glass-nav px-3 pt-2 flex items-center justify-around shadow-2xl">
        <motion.button
          onClick={() => setActiveView('home')}
          whileHover={buttonMotion.whileHover}
          whileTap={buttonMotion.whileTap}
          transition={buttonMotion.transition}
          className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeView === 'home'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Inicio</span>
        </motion.button>

        <motion.button
          onClick={() => setActiveView('shifts')}
          whileHover={buttonMotion.whileHover}
          whileTap={buttonMotion.whileTap}
          transition={buttonMotion.transition}
          className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeView === 'shifts'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Mis Turnos</span>
        </motion.button>

        <motion.button
          onClick={() => setActiveView('personal')}
          whileHover={buttonMotion.whileHover}
          whileTap={buttonMotion.whileTap}
          transition={buttonMotion.transition}
          className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-2xl transition-all cursor-pointer relative ${
            activeView === 'personal'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Agenda</span>
        </motion.button>

        <motion.button
          onClick={() => setActiveView('supervisor')}
          disabled={!canOpenSupervisor}
          whileHover={canOpenSupervisor ? buttonMotion.whileHover : undefined}
          whileTap={canOpenSupervisor ? buttonMotion.whileTap : undefined}
          transition={buttonMotion.transition}
          className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-2xl transition-all ${
            activeView === 'supervisor'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
              : canOpenSupervisor
              ? 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
              : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-70'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Jefatura</span>
        </motion.button>
      </nav>

      {showResetAnimation && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="rounded-[28px] bg-slate-900/95 border border-slate-700 shadow-2xl p-8 flex flex-col items-center gap-4 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [0.95, 1.05, 1], opacity: 1, rotate: [0, 6, -6, 0] }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          >
            <motion.div
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-fuchsia-500 flex items-center justify-center shadow-xl"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            >
              <RotateCcw className="w-10 h-10 text-white" />
            </motion.div>
            <div className="space-y-2">
              <p className="text-sm text-slate-300">Reiniciando TurnoFly...</p>
              <p className="text-lg font-bold text-white">¡Listo! La app está fresca otra vez.</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modals */}
      <ShareImageModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onFinished={() => {
          setIsImportOpen(false);
          setActiveView('home');
        }}
      />

      <EvidenceModal
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfirmClearShifts={() => setConfirmClearOpen(true)}
        onConfirmResetApp={() => setConfirmResetOpen(true)}
      />

      {/* Clear Shifts Confirmation Dialog */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {getTranslation(lang, 'clearShiftsBtn')}
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {getTranslation(lang, 'confirmClearShifts')}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold cursor-pointer"
              >
                {getTranslation(lang, 'cancel')}
              </button>
              <button
                onClick={() => {
                  clearShiftsOnly();
                  setConfirmClearOpen(false);
                  setActiveView('home');
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
              >
                {getTranslation(lang, 'confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Full App Confirmation Dialog */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {getTranslation(lang, 'resetAppBtn')}
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {getTranslation(lang, 'confirmResetApp')}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold cursor-pointer"
              >
                {getTranslation(lang, 'cancel')}
              </button>
              <button
                onClick={handleResetFullApp}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                {getTranslation(lang, 'confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppRoot() {
  const { markSplashSeen } = useApp();
  const { session, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  const handleFinish = () => {
    markSplashSeen();
    setShowSplash(false);
  };

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <motion.div
          key="splash"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24, scale: 1.03 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <Splash onFinish={handleFinish} />
        </motion.div>
      ) : isLoading ? (
        <motion.div
          key="session-loading"
          className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LoaderCircle className="w-8 h-8 animate-spin" />
        </motion.div>
      ) : !session ? (
        <motion.div
          key="auth"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <AuthScreen />
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <AppMain />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoot />
      </AppProvider>
    </AuthProvider>
  );
}
