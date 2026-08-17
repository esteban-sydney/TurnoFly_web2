import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { motion } from 'motion/react';
import {
  Calendar as CalendarIcon,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Share2,
  Copy,
  Check,
  Clock,
  Laptop,
  Building,
  Info,
  X,
  Sparkles,
  Save,
  Moon,
  Sun,
  AlertCircle,
  FileText,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { DayShift, ShiftCategory } from '../types';
import { COMMON_SHIFT_DEFINITIONS, categorizeCode } from '../utils/excelParser';
import { sanitizeClonedDocForHtml2Canvas } from '../utils/html2canvasFix';
import { normalizeWorkerName } from '../utils/workerImportMerge';
import {
  fromTimeInputValue,
  hasCustomShiftHours,
  toTimeInputValue,
} from '../utils/shiftTime';

interface ShiftAnalyzerProps {
  onOpenShareModal?: () => void;
}

export const ShiftAnalyzer: React.FC<ShiftAnalyzerProps> = ({ onOpenShareModal }) => {
  const {
    settings,
    workers,
    activeWorker,
    activeYear,
    activeMonth,
    availableShiftPeriods,
    setActiveWorkerId,
    setActiveYearMonth,
    updateDayShift,
    updateShiftDefinition,
  } = useApp();

  const lang = settings.language;
  const calendarRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [shareSuccessNotification, setShareSuccessNotification] = useState<string | null>(null);

  // Edit Single Day Shift Modal State
  const [editCode, setEditCode] = useState<string>('M');
  const [editCategory, setEditCategory] = useState<ShiftCategory>('morning');
  const [editStartTime, setEditStartTime] = useState<string>('07:00');
  const [editEndTime, setEditEndTime] = useState<string>('15:00');
  const [editIsWorkDay, setEditIsWorkDay] = useState<boolean>(true);
  const [editIsRemote, setEditIsRemote] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState<string>('');

  // Edit Shift Code Definition Legend Modal State
  const [editingLegendCode, setEditingLegendCode] = useState<string | null>(null);
  const [legendName, setLegendName] = useState<string>('');
  const [legendStartTime, setLegendStartTime] = useState<string>('07:00');
  const [legendEndTime, setLegendEndTime] = useState<string>('15:00');
  const [legendIsWorkDay, setLegendIsWorkDay] = useState<boolean>(true);
  const [legendNotification, setLegendNotification] = useState<string | null>(null);

  const handleOpenLegendEdit = (code: string) => {
    const def = COMMON_SHIFT_DEFINITIONS[code] || categorizeCode(code);
    setEditingLegendCode(code);
    setLegendName(def.name);
    setLegendStartTime(def.defaultStartTime || (def.isWorkDay ? '08:00' : ''));
    setLegendEndTime(def.defaultEndTime || (def.isWorkDay ? '16:00' : ''));
    setLegendIsWorkDay(def.isWorkDay);
  };

  const handleSaveLegendEdit = () => {
    if (!editingLegendCode) return;
    updateShiftDefinition(
      editingLegendCode,
      legendStartTime,
      legendEndTime,
      legendIsWorkDay,
      legendName
    );
    setLegendNotification(
      `¡Horario del turno "${editingLegendCode}" actualizado a ${legendStartTime || 'Libre'} - ${legendEndTime || 'Libre'} en toda la planilla!`
    );
    setEditingLegendCode(null);
    setTimeout(() => {
      setLegendNotification(null);
    }, 5000);
  };

  const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
  const firstDayOfWeek = (new Date(activeYear, activeMonth - 1, 1).getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  const monthNames = getTranslation(lang, 'months');
  const daysShort = getTranslation(lang, 'daysShort');
  const activePeriodIndex = availableShiftPeriods.findIndex(
    (period) => period.year === activeYear && period.month === activeMonth
  );
  const previousPeriod =
    activePeriodIndex > 0 ? availableShiftPeriods[activePeriodIndex - 1] : undefined;
  const nextPeriod =
    activePeriodIndex >= 0 && activePeriodIndex < availableShiftPeriods.length - 1
      ? availableShiftPeriods[activePeriodIndex + 1]
      : undefined;
  const activePeriodPrefix = `${activeYear}-${String(activeMonth).padStart(2, '0')}-`;
  const hasActiveWorkerData = Object.keys(activeWorker?.shifts || {}).some((date) =>
    date.startsWith(activePeriodPrefix)
  );

  const goToPeriod = (year: number, month: number) => {
    const periodPrefix = `${year}-${String(month).padStart(2, '0')}-`;
    const activeName = normalizeWorkerName(activeWorker?.name || '');
    const matchingWorker = workers.find(
      (worker) =>
        normalizeWorkerName(worker.name) === activeName &&
        Object.keys(worker.shifts || {}).some((date) => date.startsWith(periodPrefix))
    );

    if (matchingWorker && matchingWorker.id !== activeWorker?.id) {
      setActiveWorkerId(matchingWorker.id);
    }
    setActiveYearMonth(year, month);
  };

  useEffect(() => {
    if (availableShiftPeriods.length === 0 || activePeriodIndex >= 0) return;

    const activeValue = activeYear * 12 + activeMonth;
    const nearestPeriod = availableShiftPeriods.reduce((nearest, period) => {
      const nearestDistance = Math.abs(nearest.year * 12 + nearest.month - activeValue);
      const periodDistance = Math.abs(period.year * 12 + period.month - activeValue);
      return periodDistance < nearestDistance ? period : nearest;
    });
    setActiveYearMonth(nearestPeriod.year, nearestPeriod.month);
  }, [activeMonth, activePeriodIndex, activeYear, availableShiftPeriods]);

  // Month navigation
  const handlePrevMonth = () => {
    if (previousPeriod) goToPeriod(previousPeriod.year, previousPeriod.month);
  };

  const handleNextMonth = () => {
    if (nextPeriod) goToPeriod(nextPeriod.year, nextPeriod.month);
  };

  const handlePeriodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = event.target.value.split('-').map(Number);
    goToPeriod(year, month);
  };

  // Open Edit Modal for specific day
  const handleOpenEdit = (dateStr: string, shift?: DayShift) => {
    setSelectedDate(dateStr);
    const currentCode = shift?.rawCode || 'L';
    const def = categorizeCode(currentCode);

    setEditCode(currentCode);
    setEditCategory(shift?.category || def.category);
    setEditStartTime(shift?.startTime || def.defaultStartTime);
    setEditEndTime(shift?.endTime || def.defaultEndTime);
    setEditIsWorkDay(shift?.isWorkDay ?? def.isWorkDay);
    setEditIsRemote(shift?.isRemote ?? true);
    setEditNotes(shift?.notes || '');
  };

  const handleSaveShiftEdit = () => {
    if (!selectedDate || !activeWorker) return;

    updateDayShift(activeWorker.id, selectedDate, {
      rawCode: editCode.toUpperCase(),
      category: editCategory,
      startTime: editStartTime,
      endTime: editEndTime,
      isWorkDay: editIsWorkDay,
      isRemote: editIsRemote,
      notes: editNotes,
    });

    setSelectedDate(null);
  };

  // Helper for Clipboard Copy Fallback
  const copyTextToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  // Share & Export Calendar (Mobile Web Share API + Clipboard + Image download)
  const handleShareCalendar = async () => {
    if (!activeWorker || !activeWorker.shifts) return;
    setIsExporting(true);

    let summaryText = `📅 TurnoFly - Planilla de Turnos: ${activeWorker.name}\n`;
    summaryText += `Mes: ${monthNames[activeMonth - 1]} ${activeYear}\n\n`;

    for (let d = 1; d <= daysInMonth; d++) {
      const formattedMonth = activeMonth.toString().padStart(2, '0');
      const formattedDay = d.toString().padStart(2, '0');
      const dateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;

      const shift = activeWorker.shifts[dateStr];
      const code = shift?.rawCode || 'L';
      const def = categorizeCode(code);
      const startTime = shift?.startTime || def.defaultStartTime;
      const endTime = shift?.endTime || def.defaultEndTime;
      const isWorkDay = shift?.isWorkDay ?? def.isWorkDay;
      const time = isWorkDay && startTime ? ` (${startTime} - ${endTime})` : '';
      summaryText += `${d}/${formattedMonth}: [${code}]${time}\n`;
    }

    // Try Web Share API (native mobile share sheet for WhatsApp, iMessage, Mail, etc.)
    if (navigator.share) {
      try {
        if (calendarRef.current) {
          const canvas = await html2canvas(calendarRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          });
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const file = new File([blob], `TurnoFly_${activeWorker.name}_${activeMonth}_${activeYear}.png`, {
              type: 'image/png',
            });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `Planilla de Turnos - ${activeWorker.name}`,
                text: `TurnoFly - Planilla de Turnos de ${activeWorker.name} (${monthNames[activeMonth - 1]} ${activeYear})`,
                files: [file],
              });
              setShareSuccessNotification('¡Planilla de turnos compartida exitosamente!');
              setTimeout(() => setShareSuccessNotification(null), 4000);
              setIsExporting(false);
              return;
            }
          }
        }
        await navigator.share({
          title: `Planilla de Turnos - ${activeWorker.name}`,
          text: summaryText,
        });
        setShareSuccessNotification('¡Resumen de turnos compartido exitosamente!');
        setTimeout(() => setShareSuccessNotification(null), 4000);
        setIsExporting(false);
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') {
          setIsExporting(false);
          return;
        }
      }
    }

    // Fallback: Copy to clipboard and trigger download
    copyTextToClipboard(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    if (calendarRef.current) {
      try {
        const canvas = await html2canvas(calendarRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          onclone: (clonedDoc) => {
            sanitizeClonedDocForHtml2Canvas(clonedDoc);
          },
        });
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `TurnoFly_${activeWorker.name}_${activeMonth}_${activeYear}.png`;
        link.click();
        setShareSuccessNotification('¡Planilla copiada al portapapeles e imagen descargada!');
      } catch (err) {
        setShareSuccessNotification('¡Resumen de turnos copiado al portapapeles!');
      }
    } else {
      setShareSuccessNotification('¡Resumen de turnos copiado al portapapeles!');
    }

    setTimeout(() => setShareSuccessNotification(null), 4000);
    setIsExporting(false);
  };

  // Copy Summary Only
  const handleCopySummary = () => {
    if (!activeWorker || !activeWorker.shifts) return;

    let text = `📅 TurnoFly - Horario de Turnos: ${activeWorker.name}\n`;
    text += `Mes: ${monthNames[activeMonth - 1]} ${activeYear}\n\n`;

    for (let d = 1; d <= daysInMonth; d++) {
      const formattedMonth = activeMonth.toString().padStart(2, '0');
      const formattedDay = d.toString().padStart(2, '0');
      const dateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;

      const shift = activeWorker.shifts[dateStr];
      const code = shift?.rawCode || 'L';
      const def = categorizeCode(code);
      const startTime = shift?.startTime || def.defaultStartTime;
      const endTime = shift?.endTime || def.defaultEndTime;
      const isWorkDay = shift?.isWorkDay ?? def.isWorkDay;
      const time = isWorkDay && startTime ? ` (${startTime} - ${endTime})` : '';
      text += `Día ${d}: [${code}]${time}\n`;
    }

    copyTextToClipboard(text);
    setCopied(true);
    setShareSuccessNotification('¡Texto de turnos copiado al portapapeles!');
    setTimeout(() => {
      setCopied(false);
      setShareSuccessNotification(null);
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 overflow-x-hidden w-full">
      
      {/* Toast Notification Alert Banner */}
      {shareSuccessNotification && (
        <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 text-xs font-black flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>{shareSuccessNotification}</span>
          </div>
          <button onClick={() => setShareSuccessNotification(null)} className="p-1 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Animated shift header */}
      <motion.section
        key={`shift-header-${activeWorker?.id || 'empty'}-${activeYear}-${activeMonth}`}
        className="relative overflow-hidden p-4 pt-6 sm:p-6 sm:pt-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-indigo-100/60 dark:shadow-none"
        initial={{ opacity: 0, y: -18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: [0.94, 1.015, 1] }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <div className="absolute inset-x-0 top-0 grid h-1.5 grid-cols-5" aria-hidden="true">
          {['bg-indigo-600', 'bg-amber-400', 'bg-slate-700', 'bg-emerald-500', 'bg-sky-500'].map((color, index) => (
            <motion.span
              key={color}
              className={color}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.08 + index * 0.07, duration: 0.35, ease: 'easeOut' }}
            />
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div
              className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200 dark:shadow-indigo-950/40"
              initial={{ rotate: -30, scale: 0.55 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.18, type: 'spring', stiffness: 280, damping: 15 }}
              whileHover={{ rotate: 10, scale: 1.08 }}
              whileTap={{ rotate: -8, scale: 0.92 }}
            >
              <CalendarIcon className="w-5 h-5" />
            </motion.div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">
                {getTranslation(lang, 'shiftAnalyzerTitle')}
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white break-words">
                {activeWorker?.name || 'Calendario de Turnos'}
              </h1>
            </div>
          </div>

          {/* Controls Cluster */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Compact worker selector without repeating the active name */}
            {workers.length > 1 && (
              <motion.label
                className="relative flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold">Cambiar trabajador</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={activeWorker?.id || ''}
                  onChange={(e) => setActiveWorkerId(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Cambiar trabajador activo"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </motion.label>
            )}

            {/* Month Selector */}
            <div className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 p-0.5 rounded-xl border border-amber-200 dark:border-amber-800">
              <motion.button
                onClick={handlePrevMonth}
                disabled={!previousPeriod}
                className="p-1.5 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-white dark:hover:bg-amber-950/70 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                whileHover={previousPeriod ? { x: -3, scale: 1.08 } : undefined}
                whileTap={previousPeriod ? { x: -6, scale: 0.88 } : undefined}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              <label className="relative flex min-h-8 items-center gap-1 px-2 text-xs font-black text-amber-950 dark:text-amber-100 uppercase tracking-wider cursor-pointer">
                <span>
                  {monthNames[activeMonth - 1].substring(0, 3)} {activeYear}
                </span>
                {availableShiftPeriods.length > 1 && <ChevronDown className="w-3.5 h-3.5" />}
                <select
                  value={`${activeYear}-${String(activeMonth).padStart(2, '0')}`}
                  onChange={handlePeriodChange}
                  disabled={availableShiftPeriods.length < 2}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
                  aria-label="Seleccionar mes de turnos"
                >
                  {availableShiftPeriods.map((period) => (
                    <option
                      key={`${period.year}-${period.month}`}
                      value={`${period.year}-${String(period.month).padStart(2, '0')}`}
                    >
                      {monthNames[period.month - 1]} {period.year}
                    </option>
                  ))}
                </select>
              </label>
              <motion.button
                onClick={handleNextMonth}
                disabled={!nextPeriod}
                className="p-1.5 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-white dark:hover:bg-amber-950/70 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                whileHover={nextPeriod ? { x: 3, scale: 1.08 } : undefined}
                whileTap={nextPeriod ? { x: 6, scale: 0.88 } : undefined}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
            {availableShiftPeriods.length > 0 && (
              <span className="inline-flex min-h-8 items-center gap-1.5 px-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                <CalendarRange className="h-3.5 w-3.5 text-indigo-500" />
                {availableShiftPeriods.length}{' '}
                {availableShiftPeriods.length === 1 ? 'mes disponible' : 'meses disponibles'}
              </span>
            )}

            {/* Copy & Share Action Buttons */}
            <motion.button
              onClick={handleCopySummary}
              className="group p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
              title="Copiar texto del mes"
              whileHover={{ y: -3, rotate: -1 }}
              whileTap={{ scale: 0.9, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 460, damping: 18 }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:rotate-6" />}
              <span className="hidden sm:inline">{copied ? '¡Copiado!' : 'Copiar'}</span>
            </motion.button>

            <motion.button
              onClick={onOpenShareModal || handleShareCalendar}
              disabled={isExporting}
              className="group px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.9, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 460, damping: 18 }}
            >
              <Share2 className="w-4 h-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-0.5 group-active:scale-75" />
              <span>{isExporting ? 'Procesando...' : 'Compartir'}</span>
            </motion.button>
          </div>
        </div>
      </motion.section>

      {/* Main Calendar View Container - Fits Single Phone Screen */}
      <div
        ref={calendarRef}
        className="p-3 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 w-full max-w-full overflow-x-hidden"
      >
        <div>
            {/* Guide hint */}
            <p className="text-[10px] font-bold text-center text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              💡 Toca un día para ver detalle u horario de turno
            </p>

            {!hasActiveWorkerData ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-5 text-center dark:border-amber-800 dark:bg-amber-950/20">
                <CalendarIcon className="mb-2 h-6 w-6 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  Sin turnos cargados para este trabajador
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Selecciona otro trabajador o revisa la planilla de {monthNames[activeMonth - 1]}.
                </p>
              </div>
            ) : (
            /* Ultra-Compact Cellular 7-Column Grid */
            <div className="w-full">
              {/* Day Name Header Row */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                {daysShort.map((d: string) => (
                  <span key={d} className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">
                    {d.substring(0, 2)}
                  </span>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Empty Padding Cells for First Day of Month */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`empty_${i}`}
                    className="h-11 sm:h-16 rounded-xl bg-slate-50/40 dark:bg-slate-800/20 border border-transparent"
                  />
                ))}

                {/* Actual Month Days - CELLULAR ULTRA-COMPACT CARDS */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const formattedMonth = activeMonth.toString().padStart(2, '0');
                  const formattedDay = dayNum.toString().padStart(2, '0');
                  const dateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;

                  const shift = activeWorker?.shifts?.[dateStr];
                  const code = shift?.rawCode || 'L';
                  const def = categorizeCode(code);
                  const hasCustomHours = hasCustomShiftHours(shift, def);

                  const today = new Date();
                  const isToday = activeYear === today.getFullYear() && activeMonth === (today.getMonth() + 1) && dayNum === today.getDate();

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleOpenEdit(dateStr, shift)}
                      aria-label={`${dateStr}, turno ${code}${hasCustomHours ? ', horario ajustado' : ''}`}
                      title={
                        hasCustomHours
                          ? `Horario ajustado: ${shift?.startTime} - ${shift?.endTime}`
                          : undefined
                      }
                      className={`h-12 sm:h-16 p-1 rounded-xl border flex flex-col justify-between items-center transition-all duration-200 ease-out cursor-pointer active:scale-95 hover:-translate-y-0.5 shadow-2xs relative ${
                        isToday
                          ? 'ring-4 ring-amber-400 dark:ring-amber-400 shadow-lg shadow-amber-500/40 z-20 scale-[1.04] border-amber-400 bg-gradient-to-b from-amber-200/90 via-amber-100 to-white dark:from-amber-950/80 dark:via-slate-900 dark:to-slate-900'
                          : hasCustomHours
                          ? 'ring-2 ring-sky-500 shadow-sm shadow-sky-500/30'
                          : shift?.editedManually
                          ? 'ring-1 ring-indigo-400 hover:shadow-sm'
                          : 'hover:shadow-sm'
                      } ${def.color}`}
                    >
                      {/* Top Row: Day Number + HOY Badge / Remote Indicator */}
                      <div className="w-full flex items-center justify-between px-0.5 leading-none">
                        <span className={`text-[10px] sm:text-xs font-black ${isToday ? 'text-amber-950 dark:text-amber-300 font-black' : 'opacity-80'}`}>
                          {dayNum}
                        </span>

                        {isToday ? (
                          <span className="px-1 py-0.2 text-[7px] sm:text-[8px] font-black uppercase tracking-tighter bg-amber-400 text-slate-950 rounded-full shadow-xs animate-pulse">
                            HOY
                          </span>
                        ) : hasCustomHours ? (
                          <span
                            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm"
                            aria-label="Horario ajustado"
                          >
                            <Clock className="h-2.5 w-2.5" />
                          </span>
                        ) : shift?.isRemote ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" title="Teletrabajo" />
                        ) : null}
                      </div>

                      {/* CENTER: LARGE BOLD SHIFT CODE INITIAL (ONLY M, T, N, L, A) */}
                      <div className="my-auto">
                        <span className={`text-base sm:text-xl font-black uppercase tracking-tight leading-none block ${isToday ? 'text-slate-950 dark:text-amber-300 drop-shadow-xs' : ''}`}>
                          {code}
                        </span>
                      </div>
                      {hasCustomHours && (
                        <span className="pointer-events-none absolute inset-x-1 bottom-0.5 h-0.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            )}
        </div>
      </div>



      {/* EDIT SHIFT MODAL */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-x-hidden overflow-y-auto glass-card">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {getTranslation(lang, 'editShiftTitle')}
                </h3>
                <p className="text-xs text-slate-500">
                  Fecha: <strong>{selectedDate}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Shift Code Input */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {getTranslation(lang, 'shiftCodeLabel')}
                </label>
                <div className="flex gap-2 min-w-0">
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => {
                      const newCode = e.target.value.toUpperCase();
                      setEditCode(newCode);
                      const def = categorizeCode(newCode);
                      setEditCategory(def.category);
                      setEditStartTime(def.defaultStartTime);
                      setEditEndTime(def.defaultEndTime);
                      setEditIsWorkDay(def.isWorkDay);
                    }}
                    className="w-20 shrink-0 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white uppercase outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <select
                    value={editCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setEditCode(newCode);
                      const def = categorizeCode(newCode);
                      setEditCategory(def.category);
                      setEditStartTime(def.defaultStartTime);
                      setEditEndTime(def.defaultEndTime);
                      setEditIsWorkDay(def.isWorkDay);
                    }}
                    className="flex-1 min-w-0 w-full truncate p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 outline-none text-xs sm:text-sm"
                  >
                    <option value="M">M - Mañana (08:00 - 16:00)</option>
                    <option value="T">T - Tarde (16:00 - 24:00)</option>
                    <option value="N">N - Noche (00:00 - 08:00)</option>
                    <option value="D">D - Diferido (10:00 - 17:00)</option>
                    <option value="L">L - D?a Libre</option>
                    <option value="A">A - Admin (08:45 - 17:00)</option>
                    <option value="AV">AV - Admin Viernes (08:45 - 16:45)</option>
                    <option value="MTV">MTV - Mañana Sala TV (07:00 - 15:00)</option>
                    <option value="TTV">TTV - Tarde Sala TV (15:00 - 23:00)</option>
                    <option value="ALV">ALV - Admin Longovilo (08:45 - 17:15)</option>
                    <option value="ENL">ENL - Entrante Noche Longovilo (17:00 - 01:00)</option>
                    <option value="NLV">NLV - Noche Longovilo (23:00 - 08:00)</option>
                    <option value="ENV">ENV - Entrante Noche Viernes Longovilo (16:00 - 01:00)</option>
                    <option value="OLV">OLV - Admin Viernes Longovilo (08:45 - 16:15)</option>
                    <option value="X">X - Presencial NOC (CNT) (08:30 - 17:30)</option>
                  </select>
                </div>
              </div>

              {/* Work Day Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ¿Es día laborable?
                </span>
                <input
                  type="checkbox"
                  checked={editIsWorkDay}
                  onChange={(e) => setEditIsWorkDay(e.target.checked)}
                  className="w-5 h-5 accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Start & End Times */}
              {editIsWorkDay && (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="min-w-0">
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {getTranslation(lang, 'startTimeLabel')}
                    </label>
                    <div className="time-input-frame rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-sky-500 transition-shadow">
                      <input
                        type="time"
                        value={toTimeInputValue(editStartTime)}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="time-input-control h-11 px-3 py-0 bg-transparent border-0 font-bold text-sm text-slate-900 dark:text-white cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {getTranslation(lang, 'endTimeLabel')}
                    </label>
                    <div className="time-input-frame rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-sky-500 transition-shadow">
                      <input
                        type="time"
                        value={toTimeInputValue(editEndTime)}
                        onChange={(e) =>
                          setEditEndTime(
                            fromTimeInputValue(
                              e.target.value,
                              categorizeCode(editCode).defaultEndTime
                            )
                          )
                        }
                        className="time-input-control h-11 px-3 py-0 bg-transparent border-0 font-bold text-sm text-slate-900 dark:text-white cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 min-h-4 -mt-1">
                    {editEndTime === '24:00' ? (
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        00:00 corresponde al cierre a medianoche (24:00).
                      </p>
                    ) : hasCustomShiftHours(
                        {
                          date: selectedDate,
                          rawCode: editCode,
                          category: editCategory,
                          startTime: editStartTime,
                          endTime: editEndTime,
                          isWorkDay: editIsWorkDay,
                          editedManually: true,
                        },
                        categorizeCode(editCode)
                      ) ? (
                      <p className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                        <Clock className="h-3 w-3" />
                        Horario ajustado solo para este día.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Work Mode Option Selector (Oficina vs Teletrabajo) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Modalidad de Trabajo
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditIsRemote(false)}
                    className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                      !editIsRemote
                        ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Building className={`w-4 h-4 ${!editIsRemote ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                    <span>Oficina</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditIsRemote(true)}
                    className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                      editIsRemote
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Laptop className={`w-4 h-4 ${editIsRemote ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span>Teletrabajo</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                  {editIsRemote ? '✓ Seleccionado: Teletrabajo (Predeterminado)' : '✓ Seleccionado: Oficina'}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {getTranslation(lang, 'notesLabel')}
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ej: Cambio de turno acordado con supervisión"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer active:scale-95"
              >
                {getTranslation(lang, 'cancel')}
              </button>
              <button
                onClick={handleSaveShiftEdit}
                id="save-shift-edit-btn"
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{getTranslation(lang, 'saveChanges')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
