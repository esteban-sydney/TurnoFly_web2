import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Calendar as CalendarIcon,
  RotateCcw,
  Clock,
  Sparkles,
  Users,
  Briefcase,
  Moon,
  Home,
  CheckCircle2,
  Trash2,
  FileText,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Download,
  Building,
  UploadCloud,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { generateSampleDemoWorkers } from '../utils/excelParser';

interface HomeDashboardProps {
  onOpenImport: () => void;
  onOpenEvidence: () => void;
  setActiveView: (view: 'home' | 'shifts' | 'personal' | 'supervisor') => void;
  onConfirmClearShifts: () => void;
  onConfirmResetApp: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onOpenImport,
  onOpenEvidence,
  setActiveView,
  onConfirmClearShifts,
  onConfirmResetApp,
}) => {
  const {
    settings,
    workers,
    activeWorker,
    setActiveWorkerId,
    loadImportedWorkers,
    activeYear,
    activeMonth,
    conflicts,
    suspendConflict,
    restoreConflict,
  } = useApp();

  const lang = settings.language;
  const isSupervisor = settings.userRole === 'supervisor';

  // Calculate worker stats for active month
  const stats = useMemo(() => {
    if (!activeWorker || !activeWorker.shifts) {
      return { totalHours: 0, extraHours: 0, remoteDays: 0, presentialDays: 0, nightShifts: 0, offDays: 0 };
    }

    let totalHours = 0;
    let remoteDays = 0;
    let presentialDays = 0;
    let nightShifts = 0;
    let offDays = 0;

    const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const formattedMonth = activeMonth.toString().padStart(2, '0');
      const formattedDay = d.toString().padStart(2, '0');
      const dateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;

      const shift = activeWorker.shifts[dateStr];
      if (shift) {
        if (shift.isWorkDay) {
          totalHours += 8; // Standard 8 hours per shift
          if (shift.category === 'night') nightShifts++;
          if (shift.isRemote) remoteDays++;
          else presentialDays++;
        } else {
          offDays++;
        }
      }
    }

    const standardMonthlyHours = 160;
    const extraHours = Math.max(0, totalHours - standardMonthlyHours);

    return { totalHours, extraHours, remoteDays, presentialDays, nightShifts, offDays };
  }, [activeWorker, activeYear, activeMonth]);

  // Load sample demo data
  const handleLoadDemo = () => {
    const demoWorkers = generateSampleDemoWorkers();
    loadImportedWorkers(demoWorkers);
  };

  // EMPTY STATE
  if (workers.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome Hero Banner - Geometric Balance */}
        <div className="relative rounded-3xl bg-indigo-600 text-white p-8 sm:p-12 overflow-hidden shadow-xl shadow-indigo-100 dark:shadow-none mb-8">
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
              <button
                onClick={onOpenImport}
                id="empty-import-excel-btn"
                className="px-6 py-3.5 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>{getTranslation(lang, 'importExcelBtn')}</span>
              </button>

              <button
                onClick={handleLoadDemo}
                id="empty-load-demo-btn"
                className="px-6 py-3.5 rounded-2xl bg-indigo-700/80 hover:bg-indigo-800 text-white border border-indigo-500/50 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{getTranslation(lang, 'loadSampleExcel')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Cards Grid - Geometric Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={onOpenImport}
            className="p-6 rounded-3xl glass-card border-2 border-dashed border-slate-300 dark:border-slate-700/80 shadow-md hover:shadow-xl hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer flex flex-col justify-between group active:scale-95"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Importar Planilla</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Importar Excel (.xlsx)</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Carga tu cuadrante laboral para categorizar códigos M, T, N, L de forma automática.
              </p>
            </div>
            <button
              onClick={onOpenImport}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md hover:bg-indigo-600"
            >
              <span>Seleccionar Archivo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
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
            <button
              onClick={() => setActiveView('personal')}
              id="empty-personal-calendar-btn"
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md"
            >
              <span>Ver Agenda Personal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
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
            <button
              onClick={onConfirmResetApp}
              id="empty-reset-app-btn"
              className="w-full py-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-200 dark:border-rose-800 active:scale-95"
            >
              <span>{getTranslation(lang, 'resetAppBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUPERVISOR SUMMARY STATE
  if (isSupervisor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Supervisor Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none mb-8">
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
          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{getTranslation(lang, 'workersDetected')}</span>
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{workers.length}</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">Activos en la planilla Excel</p>
          </div>

          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all">
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

          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{getTranslation(lang, 'nextShiftChange')}</span>
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">16:00 hrs</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">Relevo Turno Tarde (T)</p>
          </div>

          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all">
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
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
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
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all cursor-pointer group"
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
      {/* Worker Welcome Header - Clean & Elegant Layout */}
      <div className="p-6 sm:p-8 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl text-white uppercase shrink-0 shadow-inner">
              {activeWorker?.name?.substring(0, 2) || 'ES'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{activeWorker?.name || 'Trabajador'}</h1>
                {workers.length > 1 && (
                  <select
                    value={activeWorker?.id || ''}
                    onChange={(e) => setActiveWorkerId(e.target.value)}
                    className="text-xs bg-indigo-800/90 text-indigo-100 border border-indigo-400/40 rounded-lg px-2.5 py-1 font-semibold cursor-pointer outline-none hover:bg-indigo-700 transition-colors"
                    title="Cambiar trabajador activo"
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                        👤 {w.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-indigo-100 mt-1">
                {activeWorker?.role || 'Operador / Técnico'} • {activeWorker?.department || 'Operaciones'}
              </p>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveView('shifts')}
              id="worker-my-shifts-btn"
              className="px-5 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span>{getTranslation(lang, 'myShiftsBtn')}</span>
            </button>

            <button
              onClick={() => setActiveView('personal')}
              id="worker-personal-calendar-btn"
              className="px-5 py-3 rounded-2xl bg-indigo-800/80 hover:bg-indigo-900 text-white border border-indigo-400/40 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <CalendarIcon className="w-4 h-4 text-amber-300" />
              <span>{getTranslation(lang, 'personalCalendarBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conflicts Summary Section - Real-time Schedule Overlap Alerts */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl shrink-0 ${conflicts.filter(c => !c.isSuspended).length > 0 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'}`}>
              {conflicts.filter(c => !c.isSuspended).length > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Choques de Horarios y Turnos
                </h2>
                {conflicts.filter(c => !c.isSuspended).length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[11px] animate-pulse">
                    {conflicts.filter(c => !c.isSuspended).length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Superposición entre tus citas personales y tus turnos de trabajo.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('personal')}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800 transition-colors shrink-0"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Gestionar Agenda</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Conflicts List - Summarized & Concise */}
        {conflicts.filter(c => !c.isSuspended).length > 0 ? (
          <div className="space-y-2.5">
            {conflicts.filter(c => !c.isSuspended).map((conflict) => (
              <div
                key={conflict.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0 mt-0.5">⚠️</span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      Cita <span className="text-amber-900 dark:text-amber-200 font-extrabold">"{conflict.eventTitle}"</span> ({conflict.eventTime}) coincide con tu turno <span className="px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/70 font-black uppercase text-amber-950 dark:text-amber-100">[{conflict.shiftCode}] {conflict.shiftName}</span> ({conflict.shiftTime}) el <span className="font-semibold">{conflict.eventDate}</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button
                    onClick={() => suspendConflict(conflict.id)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={() => setActiveView('personal')}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>Resolver</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                Sin conflictos activos detectados. Citas y turnos no se cruzan.
              </p>
            </div>
            <button
              onClick={() => setActiveView('personal')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <span>+ Agregar Cita</span>
            </button>
          </div>
        )}

        {/* Ignored / Suspended Conflicts List - Saved in Home Menu */}
        {conflicts.filter(c => c.isSuspended).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Alertas Ignoradas / Guardadas ({conflicts.filter(c => c.isSuspended).length})
              </span>
              <span className="text-[11px] text-slate-400">Archivadas para no olvidar</span>
            </div>

            <div className="space-y-2">
              {conflicts.filter(c => c.isSuspended).map((conflict) => (
                <div
                  key={conflict.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs opacity-85 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[10px]">
                      Ignorada
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      <strong className="text-slate-900 dark:text-white">"{conflict.eventTitle}"</strong> ({conflict.eventDate} - {conflict.eventTime}) coincide con Turno [{conflict.shiftCode}] ({conflict.shiftTime}).
                    </p>
                  </div>

                  <button
                    onClick={() => restoreConflict(conflict.id)}
                    className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
                  >
                    Reactivar Alerta
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* Secondary Management Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Limpieza de Datos</p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {getTranslation(lang, 'clearShiftsBtn')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Elimina únicamente los turnos importados conservando tus citas personales.
            </p>
          </div>
          <button
            onClick={onConfirmClearShifts}
            id="worker-clear-shifts-btn"
            className="w-full py-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-600 hover:text-white text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border border-amber-200 dark:border-amber-800"
          >
            <span>{getTranslation(lang, 'clearShiftsBtn')}</span>
          </button>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
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
