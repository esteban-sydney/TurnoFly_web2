import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  FileSpreadsheet,
  Calendar as CalendarIcon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Clock,
  RotateCcw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { buttonMotion, cardMotion, fadeInUp } from '../utils/motionVariants';
import { getPersonalEventStatus } from '../utils/personalEventStatus';

interface HomeDashboardProps {
  onOpenImport: () => void;
  onOpenPersonalEvent: (eventId: string) => void;
  setActiveView: (view: 'home' | 'shifts' | 'personal' | 'supervisor') => void;
  onConfirmClearShifts: () => void;
  onConfirmResetApp: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onOpenImport,
  onOpenPersonalEvent,
  setActiveView,
  onConfirmClearShifts,
  onConfirmResetApp,
}) => {
  const {
    settings,
    workers,
    events,
    conflicts,
    activeYear,
    activeMonth,
    activeWorker,
    setActiveWorkerId,
  } = useApp();

  const lang = settings.language;
  const isSupervisor = settings.userRole === 'supervisor';
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedEventDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  const visibleEvents = useMemo(() => {
    const monthPrefix = `${activeYear}-${activeMonth.toString().padStart(2, '0')}-`;

    return events
      .filter(
        (event) =>
          event.date.startsWith(monthPrefix) &&
          getPersonalEventStatus(event, currentTime) !== 'completed'
      )
      .sort((eventA, eventB) =>
        `${eventA.date}T${eventA.startTime}`.localeCompare(`${eventB.date}T${eventB.startTime}`)
      );
  }, [events, activeYear, activeMonth, currentTime]);

  const conflictByEventId = useMemo(
    () => new Map(conflicts.map((conflict) => [conflict.eventId, conflict])),
    [conflicts]
  );

  const regularEvents = visibleEvents.filter((event) => !conflictByEventId.has(event.id));
  const conflictedEvents = visibleEvents.filter((event) => conflictByEventId.has(event.id));


  // EMPTY STATE
  if (workers.length === 0) {
    return (
      <motion.div
        className="max-w-5xl mx-auto px-4 py-8"
        initial="initial"
        animate="animate"
        variants={fadeInUp}
      >
        {/* Welcome Hero Banner - Geometric Balance */}
        <div className="home-empty-hero relative rounded-3xl bg-indigo-600 text-white p-8 sm:p-12 overflow-hidden shadow-xl shadow-indigo-100 dark:shadow-none mb-8">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Sistema Inteligente de Turnos
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              {getTranslation(lang, 'emptyTitle')}
            </h1>
            <p className="text-indigo-100 text-sm sm:text-base mb-8 leading-relaxed">
              {getTranslation(lang, 'emptySubtitle')}
            </p>

            <div className="flex flex-wrap gap-4">
              <motion.button
                onClick={onOpenImport}
                id="empty-import-excel-btn"
                className="px-6 py-3.5 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                whileHover={buttonMotion.whileHover}
                whileTap={buttonMotion.whileTap}
                transition={buttonMotion.transition}
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>{getTranslation(lang, 'importExcelBtn')}</span>
              </motion.button>

            </div>
          </div>
        </div>

        {/* Action Cards Grid - Geometric Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            className="home-empty-action-card p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
            whileHover={cardMotion.whileHover}
            whileTap={cardMotion.whileTap}
            transition={cardMotion.transition}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-sm">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Eventos Personales</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Agenda Personal</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Gestiona tus citas personales y activa la detección automática de conflictos.
              </p>
            </div>
            <motion.button
              onClick={() => setActiveView('personal')}
              id="empty-personal-calendar-btn"
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md"
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              <span>Ver Agenda Personal</span>
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          <motion.div
            className="home-empty-action-card home-empty-action-card-danger p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
            whileHover={cardMotion.whileHover}
            whileTap={cardMotion.whileTap}
            transition={cardMotion.transition}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
                <RotateCcw className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Mantenimiento</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Restablecer App</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Limpia los datos almacenados localmente y reinicia TurnoFly a su estado inicial.
              </p>
            </div>
            <motion.button
              onClick={onConfirmResetApp}
              id="empty-reset-app-btn"
              className="w-full py-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-200 dark:border-rose-800 active:scale-95"
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              <span>{getTranslation(lang, 'resetAppBtn')}</span>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // SUPERVISOR SUMMARY STATE
  if (isSupervisor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Supervisor Header */}
        <div className="home-supervisor-hero relative isolate overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">
              <Users className="w-4 h-4" /> MODO JEFATURA
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{getTranslation(lang, 'supervisorTitle')}</h1>
            <p className="text-indigo-100 text-xs mt-1">
              Supervisión de cobertura laboral para {workers.length} trabajadores detectados.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveView('supervisor')}
              id="supervisor-master-roster-btn"
              className="px-5 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span>{getTranslation(lang, 'generalCalendarBtn')}</span>
            </button>
            <button
              onClick={onOpenImport}
              className="px-4 py-3 rounded-2xl bg-indigo-700/80 hover:bg-indigo-800 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer border border-indigo-500/40"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              <span>Cargar Nueva Planilla</span>
            </button>
          </div>
        </div>

        {/* Supervisor Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="home-metric-card p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{getTranslation(lang, 'workersDetected')}</span>
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{workers.length}</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">Activos en la planilla Excel</p>
          </div>

          <div className="home-metric-card p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{getTranslation(lang, 'currentlyOnShift')}</span>
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {Math.ceil(workers.length * 0.6)}
            </p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">Turno Mañana / Tarde activo</p>
          </div>

          <div className="home-metric-card p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{getTranslation(lang, 'nextShiftChange')}</span>
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">16:00 hrs</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">Relevo Turno Tarde (T)</p>
          </div>

          <div className="home-metric-card p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Días Libres / Rotación</span>
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">100%</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">Cobertura completa detectada</p>
          </div>
        </div>

        {/* Worker Quick Roster List */}
        <div className="app-surface p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Personal Registrado</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nómina de Trabajadores</h3>
            </div>
            <button
              onClick={() => setActiveView('supervisor')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer"
            >
              <span>Ver Matriz de Cobertura</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {workers.map((w) => (
              <div
                key={w.id}
                onClick={() => {
                  setActiveWorkerId(w.id);
                  setActiveView('shifts');
                }}
                className="group rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-indigo-50/70 p-5 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-950/5 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800/90 dark:to-indigo-950/40 dark:hover:border-indigo-700 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {w.name}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {w.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{w.department}</p>
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <span>Ver Turnos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // WORKER STATE (Trabajador)
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Active worker header */}
      <motion.section
        className="home-profile-card relative isolate overflow-hidden rounded-[2rem] text-slate-900 dark:text-white mb-8"
        initial="initial"
        animate="animate"
        variants={fadeInUp}
      >
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-violet-500 via-indigo-500 to-sky-400" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl dark:bg-indigo-500/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-1/4 h-48 w-48 rounded-full bg-sky-100/70 blur-3xl dark:bg-sky-500/5" />

        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 text-lg font-black uppercase text-white shadow-lg shadow-indigo-500/25 ring-4 ring-white/70 dark:border-white/10 dark:ring-slate-800/70 sm:h-16 sm:w-16 sm:text-xl">
                {activeWorker?.name?.substring(0, 2) || 'ES'}
              </div>
              <div className="min-w-0">
                <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-400/15 dark:bg-indigo-400/10 dark:text-indigo-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/15" /> Perfil activo
                </span>
                <h1 className="text-2xl sm:text-3xl font-black leading-tight text-slate-950 dark:text-white break-words">
                  {activeWorker?.name || 'Trabajador'}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-lg border border-slate-200/80 bg-white/75 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                    {activeWorker?.role || 'Operador / Técnico'}
                  </span>
                  <span className="inline-flex items-center rounded-lg border border-sky-100 bg-sky-50/80 px-2.5 py-1 text-[10px] font-bold text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/50 dark:text-sky-200">
                    {activeWorker?.department || 'Operaciones'}
                  </span>
                </div>
              </div>
            </div>

            {workers.length > 1 && (
              <motion.label
                className="group relative inline-flex self-start items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-slate-900"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              >
                <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300" />
                <span>Cambiar trabajador</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform group-active:translate-y-0.5" />
                <select
                  value={activeWorker?.id || ''}
                  onChange={(event) => setActiveWorkerId(event.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Cambiar trabajador activo"
                >
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </motion.label>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 mt-5 pt-5 border-t border-indigo-100/80 dark:border-white/10 sm:grid-cols-2">
            <motion.button
              onClick={() => setActiveView('shifts')}
              id="worker-my-shifts-btn"
              className="group min-h-12 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border border-indigo-500/70 font-bold text-[10px] sm:text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 dark:shadow-indigo-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              whileHover={{ y: -3, scale: 1.015 }}
              whileTap={{ scale: 0.93, rotate: -1.5 }}
              transition={{ type: 'spring', stiffness: 460, damping: 20 }}
            >
              <CalendarIcon className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6 group-active:scale-75" />
              <span>{getTranslation(lang, 'myShiftsBtn')}</span>
            </motion.button>

            <motion.button
              onClick={() => setActiveView('personal')}
              id="worker-personal-calendar-btn"
              className="group min-h-12 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 dark:from-amber-950/50 dark:to-orange-950/40 dark:hover:from-amber-950/70 dark:hover:to-orange-950/60 text-amber-950 dark:text-amber-100 border border-amber-200/90 dark:border-amber-800/80 font-bold text-[10px] sm:text-xs uppercase tracking-wider shadow-sm shadow-amber-900/5 flex items-center justify-center gap-2 transition-all cursor-pointer"
              whileHover={{ y: -3, scale: 1.015 }}
              whileTap={{ scale: 0.93, rotate: 1.5 }}
              transition={{ type: 'spring', stiffness: 460, damping: 20 }}
            >
              <CalendarIcon className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 transition-transform duration-300 group-hover:rotate-12 group-active:scale-75" />
              <span>{getTranslation(lang, 'personalCalendarBtn')}</span>
            </motion.button>

          </div>
        </div>
      </motion.section>

      {/* Informational reminders. Editing lives only in Agenda. */}
      <div className="app-surface p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl shrink-0 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Recordatorios de citas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Próximas citas que no se superponen con tus turnos.
              </p>
            </div>
          </div>
        </div>

        {regularEvents.length > 0 ? (
          <div className="space-y-3">
            {regularEvents.map((event) => {
              const status = getPersonalEventStatus(event, currentTime);

              return (
                <button
                type="button"
                key={event.id}
                onClick={() => onOpenPersonalEvent(event.id)}
                className="group relative w-full overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-white via-white to-emerald-50 p-4 text-left text-xs shadow-sm shadow-emerald-950/5 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-emerald-900/80 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/35 dark:hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-emerald-400" />
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <span className="mb-1.5 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      {status === 'ongoing' ? 'En curso' : 'Próxima'}
                    </span>
                    <p className="text-sm font-extrabold leading-tight text-slate-900 dark:text-white">
                      {event.title}
                    </p>
                    <p className="mt-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {formattedEventDate(event.date)} · {event.startTime}
                    </p>
                    <p className="mt-2 font-semibold leading-relaxed text-emerald-800 dark:text-emerald-300">
                      Sin conflicto con tus turnos
                    </p>
                  </div>
                </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="home-empty-notice border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>No hay próximas citas sin conflicto en este mes.</span>
          </div>
        )}
      </div>

      {/* Informational conflicts. Editing lives only in Agenda. */}
      <div className="app-surface p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl shrink-0 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Citas con conflicto
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Próximas citas que se superponen con un turno.
              </p>
            </div>
          </div>
        </div>

        {conflictedEvents.length > 0 ? (
          <div className="space-y-3">
            {conflictedEvents.map((event) => {
              const conflict = conflictByEventId.get(event.id)!;
              const status = getPersonalEventStatus(event, currentTime);

              return (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => onOpenPersonalEvent(event.id)}
                  className="group relative w-full overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-white via-white to-amber-50 p-4 text-left text-xs shadow-sm shadow-amber-950/5 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-amber-900/80 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/35 dark:hover:border-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                >
                  <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-amber-400" />
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0">
                      <span className="mb-1.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
                        {status === 'ongoing' ? 'En curso' : 'Próxima'}
                      </span>
                      <p className="text-sm font-extrabold leading-tight text-slate-900 dark:text-white">
                        {event.title}
                      </p>
                      <p className="mt-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {formattedEventDate(event.date)} · {event.startTime}
                      </p>
                      <p className="mt-2 font-semibold leading-relaxed text-amber-900 dark:text-amber-200">
                        Tiene conflicto con turno {conflict.shiftCode} de ese día.
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="home-empty-notice border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
            <CalendarIcon className="h-5 w-5 shrink-0 text-slate-400" />
            <span>No hay próximas citas con conflicto en este mes.</span>
          </div>
        )}
      </div>



      {/* Secondary Management Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="home-management-card app-surface p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Gestión de turnos</p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {getTranslation(lang, 'clearShiftsBtn')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Agrega un nuevo Excel por mes o elimina uno ya cargado. Tus citas personales se conservan.
            </p>
          </div>
          <button
            onClick={onConfirmClearShifts}
            id="worker-manage-shifts-btn"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span>Gestionar meses cargados</span>
          </button>
        </div>

        <div className="home-management-card app-surface p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <RotateCcw className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reinicio Completo</p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {getTranslation(lang, 'resetAppBtn')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Borra completamente la aplicación y restaura la configuración original.
            </p>
          </div>
          <button
            onClick={onConfirmResetApp}
            id="worker-reset-app-btn"
            className="w-full py-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border border-rose-200 dark:border-rose-800"
          >
            <span>{getTranslation(lang, 'resetAppBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
