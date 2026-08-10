import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Splash } from './components/Splash';
import { Header } from './components/Header';
import { HomeDashboard } from './components/HomeDashboard';
import { ShiftAnalyzer } from './components/ShiftAnalyzer';
import { PersonalCalendar } from './components/PersonalCalendar';
import { SupervisorView } from './components/SupervisorView';
import { ExcelImportModal } from './components/ExcelImportModal';
import { EvidenceModal } from './components/EvidenceModal';
import { SettingsModal } from './components/SettingsModal';
import { ShareImageModal } from './components/ShareImageModal';
import { FloatingActionMenu } from './components/FloatingActionMenu';
import { AlertTriangle, Trash2, RotateCcw, Home, Calendar, Clock, Users } from 'lucide-react';
import { getTranslation } from './utils/i18n';

function AppMain() {
  const { settings, clearShiftsOnly, resetFullApp, setUserRole, conflicts } = useApp();
  const lang = settings.language;

  // View Navigation State
  const [activeView, setActiveView] = useState<'home' | 'shifts' | 'personal' | 'supervisor'>('home');

  // Modal States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Confirmation Dialog States
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans overflow-x-hidden w-full">
      
      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-24 w-full max-w-full overflow-x-hidden">
        {activeView === 'home' && (
          <HomeDashboard
            onOpenImport={() => setIsImportOpen(true)}
            onOpenEvidence={() => setIsEvidenceOpen(true)}
            setActiveView={setActiveView}
            onConfirmClearShifts={() => setConfirmClearOpen(true)}
            onConfirmResetApp={() => setConfirmResetOpen(true)}
          />
        )}

        {activeView === 'shifts' && <ShiftAnalyzer onOpenShareModal={() => setIsShareModalOpen(true)} />}

        {activeView === 'personal' && <PersonalCalendar />}

        {activeView === 'supervisor' && <SupervisorView />}
      </main>

      {/* Persistent Bottom Navigation Bar for Instant Fluid Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav px-3 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveView('home')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-2xl transition-all active:scale-90 cursor-pointer ${
            activeView === 'home'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Inicio</span>
        </button>

        <button
          onClick={() => setActiveView('shifts')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-2xl transition-all active:scale-90 cursor-pointer ${
            activeView === 'shifts'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Mis Turnos</span>
        </button>

        <button
          onClick={() => setActiveView('personal')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-2xl transition-all active:scale-90 cursor-pointer relative ${
            activeView === 'personal'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Agenda</span>
          {conflicts.filter(c => !c.isSuspended).length > 0 && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => {
            setUserRole('supervisor');
            setActiveView('supervisor');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-2xl transition-all active:scale-90 cursor-pointer ${
            activeView === 'supervisor'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Jefatura</span>
        </button>
      </nav>

      {/* Modals */}
      <ShareImageModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
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
                onClick={() => {
                  resetFullApp();
                  setConfirmResetOpen(false);
                  setActiveView('home');
                }}
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

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <AppProvider>
        <Splash onFinish={() => setShowSplash(false)} />
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <AppMain />
    </AppProvider>
  );
}
