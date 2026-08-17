import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Coffee,
  CircleHelp,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { buttonMotion, cardMotion, fadeInUp } from '../utils/motionVariants';
import {
  findSimilarWorkerNames,
  groupWorkersForSupervisorDate,
  type SupervisorWorkerShift,
} from '../utils/supervisorShiftGrouping';

const formatShiftCodeBadge = (code: string, count: number) => (
  <span key={code} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wide">
    <span>{code}</span>
    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-black">{count}</span>
  </span>
);

export const SupervisorView: React.FC = () => {
  const { settings, workers, setActiveWorkerId } = useApp();
  const lang = settings.language;
  const monthNames = getTranslation(lang, 'months');

  // Default date to TODAY or current date
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  useEffect(() => {
    if (workers.length === 0) return;
    const shiftDates = Array.from(
      new Set(workers.flatMap((worker) => Object.keys(worker.shifts || {})))
    ).sort();
    if (shiftDates.length === 0) return;
    if (!shiftDates.includes(selectedDateStr)) {
      setSelectedDateStr(shiftDates[0]);
    }
  }, [workers, selectedDateStr]);

  const selectedDate = new Date(selectedDateStr + 'T00:00:00');
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1;
  const selectedDay = selectedDate.getDate();

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = daysOfWeek[selectedDate.getDay()];

  // Is today?
  const today = new Date();
  const isToday =
    selectedYear === today.getFullYear() &&
    selectedMonth === today.getMonth() + 1 &&
    selectedDay === today.getDate();

  // Navigation handlers
  const handleStepDay = (days: number) => {
    const current = new Date(selectedDateStr + 'T00:00:00');
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDateStr(`${yyyy}-${mm}-${dd}`);
  };

  const handleResetToday = () => {
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDateStr(`${yyyy}-${mm}-${dd}`);
  };

  const groupedShifts = React.useMemo(
    () => groupWorkersForSupervisorDate(workers, selectedDateStr),
    [workers, selectedDateStr]
  );

  const similarWorkerNames = React.useMemo(() => findSimilarWorkerNames(workers), [workers]);

  const groupedShiftCodeCounts = React.useMemo(() => {
    const countCodes = (items: SupervisorWorkerShift[]) => {
      return items.reduce<Record<string, number>>((acc, item) => {
        const code = item.def?.code || item.shift?.rawCode || 'UNKNOWN';
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      }, {});
    };

    return {
      night: countCodes(groupedShifts.night),
      morning: countCodes(groupedShifts.morning),
      afternoon: countCodes(groupedShifts.afternoon),
      off: countCodes(groupedShifts.off),
      other: countCodes(groupedShifts.other),
    };
  }, [groupedShifts]);

  const totalWorkingToday =
    groupedShifts.morning.length +
    groupedShifts.afternoon.length +
    groupedShifts.night.length +
    groupedShifts.other.length;

  return (
    <motion.div
      className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6"
      initial="initial"
      animate="animate"
      variants={fadeInUp}
    >
      
      {/* Supervisor Header */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl space-y-4 border border-indigo-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs uppercase tracking-widest mb-1">
              <Users className="w-4 h-4 text-amber-400" />
              <span>MODO JEFATURA • COBERTURA DIARIA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{dayName} {selectedDay} de {monthNames[selectedMonth - 1]}</span>
              {isToday && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider animate-pulse">
                  HOY
                </span>
              )}
            </h1>
            <p className="text-xs text-indigo-200 mt-1">
              Dotación de personal para el día seleccionado ({selectedYear})
            </p>
          </div>

          {/* Quick Date Control Bar */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-indigo-500/30 w-full sm:w-auto justify-between sm:justify-end">
            <motion.button
              onClick={() => handleStepDay(-1)}
              className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-800/60 transition-colors cursor-pointer"
              title="Día Anterior"
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            {!isToday && (
              <motion.button
                onClick={handleResetToday}
                className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:bg-amber-300 transition-colors cursor-pointer"
                whileHover={buttonMotion.whileHover}
                whileTap={buttonMotion.whileTap}
                transition={buttonMotion.transition}
              >
                Hoy
              </motion.button>
            )}

            <motion.input
              type="date"
              value={selectedDateStr}
              onChange={(e) => e.target.value && setSelectedDateStr(e.target.value)}
              className="bg-indigo-950 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl border border-indigo-700 focus:outline-none cursor-pointer"
              whileHover={{ scale: 1.01 }}
              whileFocus={{ scale: 1.01 }}
              transition={buttonMotion.transition}
            />

            <motion.button
              onClick={() => handleStepDay(1)}
              className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-800/60 transition-colors cursor-pointer"
              title="Día Siguiente"
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Coverage Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-indigo-700/50">
          <div className="p-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-600/40 text-center">
            <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider block">
              Trabajan Hoy
            </span>
            <span className="text-lg sm:text-xl font-black text-white">{totalWorkingToday}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-950/60 border border-amber-600/40 text-center">
            <span className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider block">
              Mañana / Diurno
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-300">{groupedShifts.morning.length}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-orange-950/60 border border-orange-600/40 text-center">
            <span className="text-[10px] text-orange-300 font-extrabold uppercase tracking-wider block">
              Tarde (T)
            </span>
            <span className="text-lg sm:text-xl font-black text-orange-300">{groupedShifts.afternoon.length}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-purple-950/60 border border-purple-600/40 text-center">
            <span className="text-[10px] text-purple-300 font-extrabold uppercase tracking-wider block">
              Noche (N)
            </span>
            <span className="text-lg sm:text-xl font-black text-purple-300">{groupedShifts.night.length}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-600/40 text-center">
            <span className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider block">
              Libres (L)
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-300">{groupedShifts.off.length}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-500/50 text-center">
            <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block">
              Sin dato
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-200">{groupedShifts.unknown.length}</span>
          </div>
        </div>
      </div>

      {similarWorkerNames.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider">Revisar nombres similares</p>
            <div className="mt-1 space-y-0.5 text-xs font-semibold">
              {similarWorkerNames.slice(0, 3).map(({ first, second }) => (
                <p key={`${first.id}-${second.id}`} className="break-words">
                  {first.name} / {second.name}
                </p>
              ))}
              {similarWorkerNames.length > 3 && (
                <p>Y {similarWorkerNames.length - 3} coincidencias adicionales.</p>
              )}
            </div>
            <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
              Se mantienen como personas separadas hasta confirmar que corresponden al mismo trabajador.
            </p>
          </div>
        </div>
      )}

      {/* SHIFT GROUPS CARDS FOR TODAY */}
      <div className="space-y-4">
        
        {/* 1. TURNO NOCHE */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-950 text-indigo-300 flex items-center justify-center font-black border border-indigo-800">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Turno Noche y Nocturnos (N, NLV, ENL, ENV)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                    {groupedShifts.night.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Incluye Noche, Noche Longovilo, Entrante Noche Longovilo y Entrante Noche Viernes Longovilo
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(groupedShiftCodeCounts.night).map(([code, count]) => formatShiftCodeBadge(code, Number(count)))}
                </div>
              </div>
            </div>
          </div>

          {groupedShifts.night.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-2">Sin colaboradores asignados a turno Noche hoy.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {groupedShifts.night.map(({ workerName, workerId, shift, def }) => (
                <motion.div
                  key={workerId}
                  onClick={() => setActiveWorkerId(workerId)}
                  className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between cursor-pointer"
                  whileHover={cardMotion.whileHover}
                  whileTap={cardMotion.whileTap}
                  transition={cardMotion.transition}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {workerName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        {workerName}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block">
                        {def?.name || 'Turno Noche'} • {def?.defaultStartTime && def?.defaultEndTime ? `${def.defaultStartTime} - ${def.defaultEndTime}` : (shift?.startTime && shift?.endTime ? `${shift.startTime} - ${shift.endTime}` : 'Noche')}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 text-[10px] font-black uppercase">
                    {def?.code || shift?.rawCode}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 2. TURNO MAÑANA / JORNADA DIURNA */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-black border border-amber-200 dark:border-amber-800">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Turno Mañana y Diurnos (M, A, D, MTV, AV, ALV, OLV, X)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                    {groupedShifts.morning.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Incluye Mañana, Mañana Sala TV, Administrativos (Viernes, Longovilo), Diferidos y Presencial NOC
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(groupedShiftCodeCounts.morning).map(([code, count]) => formatShiftCodeBadge(code, Number(count)))}
                </div>
              </div>
            </div>
          </div>

          {groupedShifts.morning.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-2">Sin colaboradores asignados a turno Mañana hoy.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {groupedShifts.morning.map(({ workerName, workerId, shift, def }) => (
                <motion.div
                  key={workerId}
                  onClick={() => setActiveWorkerId(workerId)}
                  className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between cursor-pointer"
                  whileHover={cardMotion.whileHover}
                  whileTap={cardMotion.whileTap}
                  transition={cardMotion.transition}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      {workerName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        {workerName}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block">
                        {def?.name || 'Turno Mañana'} • {def?.defaultStartTime && def?.defaultEndTime ? `${def.defaultStartTime} - ${def.defaultEndTime}` : (shift?.startTime && shift?.endTime ? `${shift.startTime} - ${shift.endTime}` : 'Mañana')}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 text-[10px] font-black uppercase">
                    {def?.code || shift?.rawCode}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 3. TURNO TARDE */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 flex items-center justify-center font-black border border-orange-200 dark:border-orange-800">
                <Sunset className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Turno Tarde (T, TTV)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-bold">
                    {groupedShifts.afternoon.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Incluye Turno Tarde (16:00 a 24:00) y Tarde Sala TV (15:00 a 23:00)
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(groupedShiftCodeCounts.afternoon).map(([code, count]) => formatShiftCodeBadge(code, Number(count)))}
                </div>
              </div>
            </div>
          </div>

          {groupedShifts.afternoon.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-2">Sin colaboradores asignados a turno Tarde hoy.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {groupedShifts.afternoon.map(({ workerName, workerId, shift, def }) => (
                <div
                  key={workerId}
                  onClick={() => setActiveWorkerId(workerId)}
                  className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/80 flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {workerName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        {workerName}
                      </span>
                      <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 block">
                        {def?.name || 'Turno Tarde'} • {def?.defaultStartTime && def?.defaultEndTime ? `${def.defaultStartTime} - ${def.defaultEndTime}` : (shift?.startTime && shift?.endTime ? `${shift.startTime} - ${shift.endTime}` : 'Tarde')}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-orange-200 dark:bg-orange-900 text-orange-950 dark:text-orange-100 text-[10px] font-black uppercase">
                    {def?.code || shift?.rawCode}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. LIBRES Y DESCANSO (SÓLO PERSONAS, ALFABÉTICAMENTE ORDENADOS) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-black border border-emerald-200 dark:border-emerald-800">
                <Coffee className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Libres y Descanso (L)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    {groupedShifts.off.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Colaboradores en su día libre o descanso legal</p>
              </div>
            </div>
          </div>

          {groupedShifts.off.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-2">Todos los colaboradores están trabajando hoy.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {groupedShifts.off.map(({ workerName, workerId }) => (
                <div
                  key={workerId}
                  onClick={() => setActiveWorkerId(workerId)}
                  className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {workerName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        {workerName}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        🌴 Día Libre / Descanso
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {groupedShifts.unknown.length > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <CircleHelp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Sin información para la fecha</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold">
                    {groupedShifts.unknown.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estos registros no se contabilizan como libres ni como trabajadores presentes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {groupedShifts.unknown.map(({ workerName, workerId, shift }) => (
                <div
                  key={workerId}
                  onClick={() => setActiveWorkerId(workerId)}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-2.5 cursor-pointer hover:border-indigo-400 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {workerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                      {workerName}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {shift?.rawCode ? `Revisar código ${shift.rawCode}` : 'Sin turno cargado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
};
