import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  Users,
  Sparkles,
  Loader2,
  Calendar,
  AlertTriangle,
  HelpCircle,
  Save,
  Flag,
  Trash2,
  Layers3,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { ImportedWorkerMonth } from '../types';
import {
  assignWorkersToReferencePeriod,
  normalizeWorkerName,
} from '../utils/workerImportMerge';
import {
  parseExcelBuffer,
  generateSampleExcelBuffer,
  generateSampleDemoWorkers,
  ParseExcelResult,
  MONTH_NAMES_ES,
  OutOfRangePolicy,
} from '../utils/excelParser';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinished?: () => void;
}

interface SavedMonthImport extends ImportedWorkerMonth {
  key: string;
  selectedWorkerName: string;
  sourceFileName: string;
  totalShiftsCount: number;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onFinished,
}) => {
  const { settings, loadImportedWorkerMonths, activeYear, activeMonth } = useApp();
  const lang = settings.language;

  const now = new Date();
  const [refMonth, setRefMonth] = useState<number>(activeMonth || now.getMonth() + 1);
  const [refYear, setRefYear] = useState<number>(activeYear || now.getFullYear());
  const [outOfRangePolicy, setOutOfRangePolicy] = useState<OutOfRangePolicy>('remap_last_day');

  const [rawFileBuffer, setRawFileBuffer] = useState<ArrayBuffer | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParseExcelResult | null>(null);
  const [savedMonths, setSavedMonths] = useState<SavedMonthImport[]>([]);

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

  if (!isOpen) return null;

  const processBuffer = async (
    buffer: ArrayBuffer,
    monthVal: number,
    yearVal: number,
    policy: OutOfRangePolicy
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await parseExcelBuffer(buffer, yearVal, monthVal, policy);
      setParsedData(result);
      if (result.workers.length > 0) {
        const preferredWorkerName = savedMonths[0]?.selectedWorkerName;
        const preferredWorker = preferredWorkerName
          ? result.workers.find(
              (worker) =>
                normalizeWorkerName(worker.name) === normalizeWorkerName(preferredWorkerName)
            )
          : undefined;
        const esteban = result.workers.find((worker) =>
          worker.name.toLowerCase().includes('esteban')
        );
        setSelectedWorkerId((preferredWorker || esteban || result.workers[0]).id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el archivo Excel. Verifica el formato.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. File size check (max 8MB)
    const maxSizeBytes = 8 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage('El archivo excede el tamaño máximo permitido de 8 MB.');
      return;
    }

    // 2. Extension check
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setErrorMessage('Por favor selecciona un archivo con formato .xlsx o .xls');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      setCurrentFileName(file.name);
      setRawFileBuffer(buffer);
      await processBuffer(buffer, refMonth, refYear, outOfRangePolicy);
    } catch (err: any) {
      setErrorMessage('Error al leer el archivo. Asegúrate de que no esté dañado.');
    }
  };

  const handleRefMonthYearChange = async (newMonth: number, newYear: number) => {
    setRefMonth(newMonth);
    setRefYear(newYear);
    if (rawFileBuffer) {
      await processBuffer(rawFileBuffer, newMonth, newYear, outOfRangePolicy);
    }
  };

  const handlePolicyChange = async (newPolicy: OutOfRangePolicy) => {
    setOutOfRangePolicy(newPolicy);
    if (rawFileBuffer) {
      await processBuffer(rawFileBuffer, refMonth, refYear, newPolicy);
    }
  };

  const handleAcceptDetectedMonthYear = async () => {
    if (!parsedData || !parsedData.detectedMonth || !parsedData.detectedYear) return;
    const m = parsedData.detectedMonth;
    const y = parsedData.detectedYear;
    setRefMonth(m);
    setRefYear(y);
    if (rawFileBuffer) {
      await processBuffer(rawFileBuffer, m, y, outOfRangePolicy);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const resetCurrentFile = () => {
    setParsedData(null);
    setRawFileBuffer(null);
    setCurrentFileName('');
    setSelectedWorkerId('');
    setErrorMessage(null);
  };

  const moveReferenceToNextMonth = () => {
    if (refMonth === 12) {
      setRefMonth(1);
      setRefYear((year) => year + 1);
    } else {
      setRefMonth((month) => month + 1);
    }
  };

  const handleSaveMonth = () => {
    if (!parsedData || parsedData.workers.length === 0) return;

    const sourceFileName = currentFileName || parsedData.sourceSheetName;
    const referencedWorkers = assignWorkersToReferencePeriod(
      parsedData.workers,
      refYear,
      refMonth
    ).map((worker) => ({
      ...worker,
      importMetadata: {
        ...worker.importMetadata,
        sourceFileName,
        importedAt: new Date().toISOString(),
      },
    }));
    const selectedWorker =
      referencedWorkers.find((worker) => worker.id === selectedWorkerId) ||
      referencedWorkers[0];
    const key = `${refYear}-${String(refMonth).padStart(2, '0')}`;
    const savedMonth: SavedMonthImport = {
      key,
      workers: referencedWorkers,
      selectedWorkerId: selectedWorker.id,
      selectedWorkerName: selectedWorker.name,
      referenceMonth: refMonth,
      referenceYear: refYear,
      sourceFileName,
      totalShiftsCount: parsedData.totalShiftsCount,
    };
    const alreadySaved = savedMonths.some((item) => item.key === key);

    setSavedMonths((current) => {
      const existingIndex = current.findIndex((item) => item.key === key);
      if (existingIndex === -1) {
        return [...current, savedMonth].sort((left, right) => left.key.localeCompare(right.key));
      }

      return current
        .map((item, index) => (index === existingIndex ? savedMonth : item))
        .sort((left, right) => left.key.localeCompare(right.key));
    });
    setSuccessMessage(
      `${MONTH_NAMES_ES[refMonth - 1]} ${refYear} ${
        alreadySaved ? 'actualizado' : 'guardado'
      }. Ya puedes cargar otro mes.`
    );
    resetCurrentFile();
    moveReferenceToNextMonth();
  };

  const handleDeleteSavedMonth = (key: string) => {
    setSavedMonths((current) => current.filter((item) => item.key !== key));
  };

  const handleFinishImport = () => {
    if (parsedData) {
      setErrorMessage('Guarda el mes que estás revisando antes de finalizar la importación.');
      return;
    }
    if (savedMonths.length === 0) return;

    loadImportedWorkerMonths(
      [...savedMonths]
        .sort((left, right) => left.key.localeCompare(right.key))
        .map(({ workers, selectedWorkerId, referenceMonth, referenceYear, sourceFileName }) => ({
        workers,
        selectedWorkerId,
        referenceMonth,
        referenceYear,
        sourceFileName,
        }))
    );
    setSavedMonths([]);
    setSuccessMessage(null);
    resetCurrentFile();
    onFinished?.();
    if (!onFinished) onClose();
  };

  const handleDownloadSample = async () => {
    try {
      const buffer = await generateSampleExcelBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TurnoFly_Planilla_${MONTH_NAMES_ES[refMonth - 1]}_${refYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating sample spreadsheet:', error);
      setErrorMessage('No se pudo generar la planilla de ejemplo. Inténtalo nuevamente.');
    }
  };

  const handleLoadDemo = () => {
    const demoWorkers = generateSampleDemoWorkers();
    const demoMonth = demoWorkers[0]?.referenceMonth || refMonth;
    const demoYear = demoWorkers[0]?.referenceYear || refYear;
    setRefMonth(demoMonth);
    setRefYear(demoYear);
    setCurrentFileName('Planilla_Demostracion_Agosto_2026.xlsx');
    setSelectedWorkerId(demoWorkers[0].id);
    setParsedData({
      workers: demoWorkers,
      year: demoYear,
      month: demoMonth,
      totalShiftsCount: demoWorkers.reduce(
        (total, worker) => total + Object.keys(worker.shifts).length,
        0
      ),
      detectedMonth: demoMonth,
      detectedYear: demoYear,
      detectedMonthName: MONTH_NAMES_ES[demoMonth - 1],
      detectedLayout: 'matrix',
      sourceSheetName: 'Turnos',
      outOfRangeDaysCount: 0,
      hasMonthMismatch: false,
    });
    setSuccessMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] glass-card">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {getTranslation(lang, 'importTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Análisis inteligente y alineación con mes de referencia (.xlsx / .xls)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* Reference Month & Year Selector Controls */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Mes de Referencia Objetivo
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Los turnos del Excel se asignarán a las fechas de este mes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={refMonth}
                onChange={(e) => handleRefMonthYearChange(parseInt(e.target.value, 10), refYear)}
                className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              >
                {MONTH_NAMES_ES.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={refYear}
                onChange={(e) => handleRefMonthYearChange(refMonth, parseInt(e.target.value, 10))}
                className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {savedMonths.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30">
              <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-indigo-200/70 dark:border-indigo-800/70">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-100">
                    Meses guardados
                  </h3>
                </div>
                <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">
                  {savedMonths.length} {savedMonths.length === 1 ? 'mes' : 'meses'}
                </span>
              </div>
              <div className="divide-y divide-indigo-200/60 dark:divide-indigo-800/60">
                {savedMonths.map((savedMonth) => (
                  <div
                    key={savedMonth.key}
                    className="px-4 py-3 flex items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/40"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white">
                          {MONTH_NAMES_ES[savedMonth.referenceMonth - 1]} {savedMonth.referenceYear}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {savedMonth.sourceFileName} · {savedMonth.workers.length} trabajadores · {savedMonth.selectedWorkerName}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedMonth(savedMonth.key)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      aria-label={`Eliminar ${MONTH_NAMES_ES[savedMonth.referenceMonth - 1]} ${savedMonth.referenceYear}`}
                      title="Quitar mes guardado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5" role="status" aria-live="polite">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!parsedData ? (
            <>
              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 transition-all group flex flex-col items-center justify-center cursor-pointer"
              >
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {getTranslation(lang, 'dragDropText')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {getTranslation(lang, 'maxSizeNotice')}
                </p>

                <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-700 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-600 shadow-sm uppercase tracking-wider">
                  Seleccionar Archivo
                </div>
              </div>

              {/* Sample Excel Helper Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-indigo-900 dark:text-indigo-200 font-medium">
                    ¿Sin archivo listo? Genera una planilla de ejemplo o carga la demostración.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleDownloadSample}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Ejemplo</span>
                  </button>

                  <button
                    onClick={handleLoadDemo}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Cargar Ejemplo</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Detection Results & Reference Alignment Prompts */
            <div className="space-y-6">
              
              {/* Success Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Análisis de Estructura Completado</p>
                  <p>
                    Se detectaron <strong>{parsedData.workers.length} trabajadores</strong>,{' '}
                    <strong>{parsedData.totalShiftsCount} entradas de turnos</strong> (Formato:{' '}
                    <span className="uppercase font-mono font-bold">{parsedData.detectedLayout}</span>).
                  </p>
                </div>
              </div>

              {/* Month Mismatch Alert & Quick Swap Prompt */}
              {parsedData.hasMonthMismatch && parsedData.detectedMonthName && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Detección de Mes Diferente en la Hoja</p>
                      <p className="mt-1">
                        El archivo Excel parece corresponder a{' '}
                        <strong>
                          {parsedData.detectedMonthName} {parsedData.detectedYear || refYear}
                        </strong>
                        , pero tu mes de referencia actual es{' '}
                        <strong>
                          {MONTH_NAMES_ES[refMonth - 1]} {refYear}
                        </strong>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                    <button
                      onClick={handleAcceptDetectedMonthYear}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Usar {parsedData.detectedMonthName} {parsedData.detectedYear || refYear}</span>
                    </button>
                    <button
                      onClick={() => {}} // keeps current selection
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <span>Mantener {MONTH_NAMES_ES[refMonth - 1]} {refYear}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Out of Range Days Prompt (e.g. Day 31 in April) */}
              {parsedData.outOfRangeDaysCount > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Ajuste de Días Fuera de Rango</p>
                      <p className="mt-1">
                        Se encontraron {parsedData.outOfRangeDaysCount} entradas con día 31, pero{' '}
                        <strong>{MONTH_NAMES_ES[refMonth - 1]}</strong> tiene un máximo de{' '}
                        <strong>{new Date(refYear, refMonth, 0).getDate()} días</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <p className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      ¿Cómo deseas procesar estas celdas?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePolicyChange('remap_last_day')}
                        className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                          outOfRangePolicy === 'remap_last_day'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <p className="font-bold">Remapear al último día</p>
                        <p className="text-[10px] opacity-80">Asignar día 31 al día {new Date(refYear, refMonth, 0).getDate()}</p>
                      </button>

                      <button
                        onClick={() => handlePolicyChange('ignore')}
                        className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                          outOfRangePolicy === 'ignore'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <p className="font-bold">Ignorar días inválidos</p>
                        <p className="text-[10px] opacity-80">Omitir celdas fuera del rango del mes</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Worker Profile Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  {getTranslation(lang, 'selectWorkerPrompt')}
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {parsedData.workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role || 'Operador'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Workers Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  {getTranslation(lang, 'previewWorkers')}
                </h4>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedData.workers.map((w) => (
                    <div key={w.id} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{w.name}</span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {Object.keys(w.shifts).length} días mapeados a {MONTH_NAMES_ES[refMonth - 1]} {refYear}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={parsedData ? resetCurrentFile : onClose}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer self-start sm:self-auto"
          >
            {parsedData ? 'Cambiar archivo' : 'Cerrar'}
          </button>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            {parsedData && (
              <button
                type="button"
                onClick={handleSaveMonth}
                disabled={isLoading}
                id="save-excel-month-btn"
                className="min-h-11 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black text-[11px] shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all text-center leading-tight disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>
                  {savedMonths.some(
                    (item) =>
                      item.referenceMonth === refMonth && item.referenceYear === refYear
                  )
                    ? 'Actualizar'
                    : 'Guardar'}{' '}
                  {MONTH_NAMES_ES[refMonth - 1]} {refYear}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleFinishImport}
              disabled={savedMonths.length === 0 || Boolean(parsedData)}
              id="finish-excel-import-btn"
              className={`${parsedData ? '' : 'col-start-2'} min-h-11 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-[11px] shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100 text-center leading-tight`}
              title={parsedData ? 'Guarda el mes actual antes de finalizar' : 'Aplicar todos los meses guardados'}
            >
              <Flag className="w-4 h-4 shrink-0" />
              <span>Finalizar ({savedMonths.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
