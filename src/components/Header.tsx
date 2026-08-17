import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Plane, Moon, Sun, Globe, Settings, Users, User, Bell, LogOut, Cloud, CloudOff, LoaderCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../utils/i18n';
import { Language } from '../types';
import { buttonMotion, fadeInUp } from '../utils/motionVariants';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenImport: () => void;
  activeView: 'home' | 'shifts' | 'personal' | 'supervisor';
  setActiveView: (view: 'home' | 'shifts' | 'personal' | 'supervisor') => void;
  disableSupervisor?: boolean;
  onSignOut: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenImport,
  activeView,
  setActiveView,
  disableSupervisor = false,
  onSignOut,
}) => {
  const { settings, setTheme, setUserRole, events, cloudSyncStatus } = useApp();
  const { user } = useAuth();
  const lang = settings.language;
  const eventCount = events.length;
  const accountEmail = user?.email || 'Cuenta TurnoFly';
  const isCloudBusy = cloudSyncStatus === 'loading' || cloudSyncStatus === 'saving';
  const cloudLabel =
    cloudSyncStatus === 'synced'
      ? 'Agenda sincronizada y privada'
      : cloudSyncStatus === 'local'
        ? 'Agenda guardada solo en este dispositivo'
        : cloudSyncStatus === 'error'
          ? 'No se pudo sincronizar la agenda'
          : 'Sincronizando agenda';

  return (
    <motion.header
      className="app-safe-header sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md transition-colors px-3 sm:px-6 md:px-10 pb-2.5 shrink-0 shadow-xs"
      initial="initial"
      animate="animate"
      variants={fadeInUp}
    >
      
      {/* Responsive Row Container: Left to Right Alignment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
        
        {/* Left Side: Brand Logo & Title */}
        <div
          className="flex items-center justify-between w-full sm:w-auto"
          onClick={() => setActiveView('home')}
        >
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-md shadow-indigo-500/25 shrink-0">
              T
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Turno<span className="text-indigo-600 dark:text-indigo-400">Fly</span>
                </h1>
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                  v1.0
                </span>
              </div>
              <p className="mt-0.5 flex max-w-36 items-center gap-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400 sm:hidden">
                <span className="truncate">{accountEmail}</span>
                {isCloudBusy ? (
                  <LoaderCircle className="h-2.5 w-2.5 shrink-0 animate-spin" />
                ) : cloudSyncStatus === 'synced' ? (
                  <Cloud className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                ) : (
                  <CloudOff className="h-2.5 w-2.5 shrink-0 text-amber-600" />
                )}
              </p>
            </div>
          </div>

          {/* Quick Controls for Mobile View (Right of Logo) */}
          <motion.div className="flex items-center gap-1.5 sm:hidden shrink-0">
            {/* Appointment reminder bell */}
            {eventCount > 0 && (
              <motion.button
                onClick={() => setActiveView('personal')}
                className="relative p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 animate-pulse cursor-pointer"
                title={`${eventCount} citas registradas`}
                whileHover={buttonMotion.whileHover}
                whileTap={buttonMotion.whileTap}
                transition={buttonMotion.transition}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {eventCount}
                </span>
              </motion.button>
            )}

            {/* Theme Toggle Button */}
            <motion.button
              onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
              id="theme-toggle-mobile-btn"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                settings.theme === 'dark'
                  ? 'bg-indigo-950 border-indigo-700 text-amber-300'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}
              title={getTranslation(lang, 'theme')}
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </motion.button>

            {/* Settings Button */}
            <motion.button
              onClick={onOpenSettings}
              id="settings-trigger-mobile-btn"
              className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center cursor-pointer shadow-xs"
              title={getTranslation(lang, 'settings')}
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              <Settings className="w-4 h-4" />
            </motion.button>

            <motion.button
              onClick={() => void onSignOut()}
              className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center cursor-pointer shadow-xs"
              title={`Cerrar sesión de ${accountEmail}`}
              aria-label={`Cerrar sesión de ${accountEmail}`}
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>

        {/* Middle / Right Section: Role Switcher & Action Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          
          {/* Role Toggle Switcher (Worker vs Supervisor) */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 text-xs w-full sm:w-auto shadow-inner">
            <motion.button
              onClick={() => {
                setUserRole('worker');
                if (activeView === 'supervisor') setActiveView('home');
              }}
              id="role-worker-btn"
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                settings.userRole === 'worker'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>{getTranslation(lang, 'workerMode')}</span>
            </motion.button>
            <motion.button
              onClick={() => !disableSupervisor && setActiveView('supervisor')}
              id="role-supervisor-btn"
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                settings.userRole === 'supervisor'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : disableSupervisor
                  ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-80'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={disableSupervisor ? 'Carga una planilla para activar modo Jefatura' : getTranslation(lang, 'supervisorMode')}
              whileHover={!disableSupervisor ? buttonMotion.whileHover : undefined}
              whileTap={!disableSupervisor ? buttonMotion.whileTap : undefined}
              transition={buttonMotion.transition}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>{getTranslation(lang, 'supervisorMode')}</span>
            </motion.button>
          </div>

          {/* Desktop Controls (Theme + Conflicts + Settings) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div
              className="hidden lg:flex min-w-0 max-w-56 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title={`${accountEmail}. ${cloudLabel}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[10px] font-black uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {accountEmail.charAt(0)}
              </span>
              <span className="min-w-0 truncate text-[11px] font-bold">{accountEmail}</span>
              {isCloudBusy ? (
                <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-500" />
              ) : cloudSyncStatus === 'synced' ? (
                <Cloud className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              )}
            </div>

            {/* Appointment reminder bell */}
            {eventCount > 0 && (
              <motion.button
                onClick={() => setActiveView('personal')}
                id="event-notification-btn"
                className="relative p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 animate-pulse cursor-pointer shrink-0"
                title={`${eventCount} citas registradas`}
                whileHover={buttonMotion.whileHover}
                whileTap={buttonMotion.whileTap}
                transition={buttonMotion.transition}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {eventCount}
                </span>
              </motion.button>
            )}

            {/* Theme Toggle Button */}
            <motion.button
              onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
              id="theme-toggle-btn"
              className={`flex items-center justify-center px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
                settings.theme === 'dark'
                  ? 'bg-indigo-950/80 border-indigo-700 text-amber-300 hover:bg-indigo-900'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
              title={getTranslation(lang, 'theme')}
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              {settings.theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="ml-1.5">Día</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="ml-1.5">Noche</span>
                </>
              )}
            </motion.button>

            {/* Settings Button */}
            <motion.button
              onClick={onOpenSettings}
              id="settings-trigger-btn"
              className="w-9 h-9 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0"
              title={getTranslation(lang, 'settings')}
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              <Settings className="w-4 h-4" />
            </motion.button>

            <motion.button
              onClick={() => void onSignOut()}
              className="w-9 h-9 rounded-xl border border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 flex items-center justify-center hover:text-rose-600 transition-colors cursor-pointer shadow-xs shrink-0"
              title={`Cerrar sesión de ${accountEmail}`}
              aria-label={`Cerrar sesión de ${accountEmail}`}
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>

        </div>
      </div>
    </motion.header>
  );
};
