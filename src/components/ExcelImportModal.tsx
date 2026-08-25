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
  getWorkerIdentityKey,
} from '../utils/workerImportMerge';
import {
  parseExcelWorkbookBuffer,
  generateSampleExcelBuffer,
  ParseExcelResult,
  SkippedExcelMonthBlock,
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

const getNextAvailableReference = (
  year: number,
  month: number,
  importedKeys: Set<string>
) => {
  let candidateYear = year;
  let candidateMonth = month;

  for (let offset = 0; offset < 120; offset += 1) {
    const key = `${candidateYear}-${String(candidateMonth).padStart(2, '0')}`;
    if (!importedKeys.has(key)) {
      return { year: candidateYear, month: candidateMonth };
    }

    if (candidateMonth === 12) {
      candidateMonth = 1;
      candidateYear += 1;
    } else {
      candidateMonth += 1;
    }
  }

  return { year, month };
};

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onFinished,
}) => {
  const {
    settings,
    loadImportedWorkerMonths,
    activeYear,
    activeMonth,
    shiftImports,
  } = useApp();
  const lang = settings.language;

  const now = new Date();
  const initialReference = getNextAvailableReference(
    activeYear || now.getFullYear(),
    activeMonth || now.getMonth() + 1,
    new Set(shiftImports.map((item) => item.key))
  );
  const [refMonth, setRefMonth] = useState<number>(initialReference.month);
  const [refYear, setRefYear] = useState<number>(initialReference.year);
  const [outOfRangePolicy, setOutOfRangePolicy] = useState<OutOfRangePolicy>('remap_last_day');

  const [rawFileBuffer, setRawFileBuffer] = useState<ArrayBuffer | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParseExcelResult | null>(null);
  const [parsedMonths, setParsedMonths] = useState<ParseExcelResult[]>([]);
  const [detectedBlockCount, setDetectedBlockCount] = useState(0);
  const [skippedBlocks, setSkippedBlocks] = useState<SkippedExcelMonthBlock[]>([]);
  const [savedMonths, setSavedMonths] = useState<SavedMonthImport[]>([]);
  const [pendingReplacement, setPendingReplacement] = useState<SavedMonthImport[] | null>(null);

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
      const workbookResult = await parseExcelWorkbookBuffer(buffer, yearVal, monthVal, policy);
      const primaryResult = workbookResult.months[0];
      setParsedMonths(workbookResult.months);
      setDetectedBlockCount(workbookResult.detectedBlockCount);
      setSkippedBlocks(workbookResult.skippedBlocks);
      setParsedData(primaryResult);
      if (primaryResult.workers.length > 0) {
        const preferredWorkerName = savedMonths[0]?.selectedWorkerName;
        const preferredWorker = preferredWorkerName
          ? primaryResult.workers.find(
              (worker) =>
                getWorkerIdentityKey(worker.name) === getWorkerIdentityKey(preferredWorkerName)
            )
          : undefined;
        const esteban = primaryResult.workers.find((worker) =>
          worker.name.toLowerCase().includes('esteban')
        );
        setSelectedWorkerId((preferredWorker || esteban || primaryResult.workers[0]).id);
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
    setParsedMonths([]);
    setDetectedBlockCount(0);
    setSkippedBlocks([]);
    setRawFileBuffer(null);
    setCurrentFileName('');
    setSelectedWorkerId('');
    setErrorMessage(null);
  };

  const moveReferenceToNextMonth = (newlySavedKeys: string[] = []) => {
    const latestKey = [...newlySavedKeys].sort().at(-1);
    const [latestYear, latestMonth] = latestKey
      ? latestKey.split('-').map(Number)
      : [refYear, refMonth];
    const nextMonth = latestMonth === 12 ? 1 : latestMonth + 1;
    const nextYear = latestMonth === 12 ? latestYear + 1 : latestYear;
    const occupiedKeys = new Set([
      ...shiftImports.map((item) => item.key),
      ...savedMonths.map((item) => item.key),
      ...newlySavedKeys,
    ]);
    const nextReference = getNextAvailableReference(nextYear, nextMonth, occupiedKeys);

    setRefMonth(nextReference.month);
    setRefYear(nextReference.year);
  };

  const commitSavedMonths = (imports: SavedMonthImport[], isUpdate: boolean) => {
    setSavedMonths((current) => {
      const records = new Map(current.map((item) => [item.key, item] as const));
      imports.forEach((item) => records.set(item.key, item));
      return Array.from(records.values()).sort((left, right) => left.key.localeCompare(right.key));
    });
    const periodLabel =
      imports.length === 1
        ? `${MONTH_NAMES_ES[imports[0].referenceMonth - 1]} ${imports[0].referenceYear}`
        : `${imports.length} meses`;
    setSuccessMessage(`${periodLabel} ${isUpdate ? 'preparados para actualizar' : 'guardados'}. Ya puedes cargar otro archivo.`);
    setPendingReplacement(null);
    resetCurrentFile();
    moveReferenceToNextMonth(imports.map((item) => item.key));
  };

  const handleSaveMonth = () => {
    if (!parsedData || parsedData.workers.length === 0) return;

    const sourceFileName = currentFileName || parsedData.sourceSheetName;
    const primarySelectedWorker =
      parsedData.workers.find((worker) => worker.id === selectedWorkerId) || parsedData.workers[0];
    const selectedIdentity = getWorkerIdentityKey(primarySelectedWorker.name);
    const monthsToSave = parsedMonths.length > 0 ? parsedMonths : [parsedData];
    const multiMonthWorkbook = monthsToSave.length > 1;
    const imports = monthsToSave.map((monthResult) => {
      const referenceMonth = multiMonthWorkbook ? monthResult.month : refMonth;
      const referenceYear = multiMonthWorkbook ? monthResult.year : refYear;
      const referencedWorkers = assignWorkersToReferencePeriod(
        monthResult.workers,
        referenceYear,
        referenceMonth
      ).map((worker) => ({
        ...worker,
        importMetadata: {
          ...worker.importMetadata,
          sourceFileName,
          importedAt: new Date().toISOString(),
        },
      }));
      const selectedWorker = referencedWorkers.find(
        (worker) => getWorkerIdentityKey(worker.name) === selectedIdentity
      );
      const key = `${referenceYear}-${String(referenceMonth).padStart(2, '0')}`;

      return {
        key,
        workers: referencedWorkers,
        selectedWorkerId: selectedWorker?.id,
        selectedWorkerName: selectedWorker?.name || primarySelectedWorker.name,
        referenceMonth,
        referenceYear,
        sourceFileName,
        totalShiftsCount: monthResult.totalShiftsCount,
      } satisfies SavedMonthImport;
    });
    const existingImportedKeys = new Set(shiftImports.map((item) => item.key));
    const stagedKeys = new Set(savedMonths.map((item) => item.key));
    const needsConfirmation = imports.some(
      (item) => existingImportedKeys.has(item.key) && !stagedKeys.has(item.key)
    );

    if (needsConfirmation) {
      setPendingReplacement(imports);
      return;
    }

    commitSavedMonths(
      imports,
      imports.some((item) => stagedKeys.has(item.key) || existingImportedKeys.has(item.key))
    );
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

  const isMultiMonthWorkbook = detectedBlockCount > 1;
  const parsedShiftCount = parsedMonths.reduce(
    (total, item) => total + item.totalShiftsCount,
    0
  );
  const parsedWorkerCount = new Set(
    parsedMonths.flatMap((item) => item.workers.map((worker) => getWorkerIdentityKey(worker.name)))
  ).size;
  const parsedOutOfRangeCount = parsedMonths.reduce(
    (total, item) => total + item.outOfRangeDaysCount,
    0
  );
  const selectedWorkerIdentity = getWorkerIdentityKey(
    parsedData?.workers.find((worker) => worker.id === selectedWorkerId)?.name || ''
  );
  const selectedWorkerMonthCount = selectedWorkerIdentity
    ? parsedMonths.filter((item) =>
        item.workers.some(
          (worker) => getWorkerIdentityKey(worker.name) === selectedWorkerIdentity
        )
      ).length
    : 0;
  const parsedPeriodKeys = new Set(
    isMultiMonthWorkbook
      ? parsedMonths.map(
          (item) => `${item.year}-${String(item.month).padStart(2, '0')}`
        )
      : [`${refYear}-${String(refMonth).padStart(2, '0')}`]
  );
  const willUpdateParsedPeriods = [...savedMonths, ...shiftImports].some((item) =>
    parsedPeriodKeys.has(item.key)
  );
  const replacementPeriods = (pendingReplacement || []).filter((item) =>
    shiftImports.some((record) => record.key === item.key)
  );

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
                Detecta uno o varios meses y alinea sus turnos (.xlsx / .xls)
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
                  {isMultiMonthWorkbook
                    ? 'El archivo define sus propios meses; esta referencia solo se usa como año de apoyo.'
                    : 'Los turnos del Excel se asignarán a las fechas de este mes.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={refMonth}
                onChange={(e) => handleRefMonthYearChange(parseInt(e.target.value, 10), refYear)}
                disabled={isMultiMonthWorkbook}
                className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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
                disabled={isMultiMonthWorkbook}
                className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {shiftImports.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-black text-indigo-700 dark:text-indigo-300">
                <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                {shiftImports.length} {shiftImports.length === 1 ? 'mes cargado' : 'meses cargados'}
              </span>
              <span className="truncate">
                {shiftImports
                  .map((item) => `${MONTH_NAMES_ES[item.month - 1]} ${item.year}`)
                  .join(' · ')}
              </span>
            </div>
          )}

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

              {/* Sample spreadsheet download */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-indigo-900 dark:text-indigo-200 font-medium">
                    ¿Sin archivo listo? Descarga una planilla neutra para conocer el formato.
                  </span>
                </div>
                <button
                  onClick={handleDownloadSample}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Ejemplo</span>
                </button>
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
                    {isMultiMonthWorkbook && <><strong>{parsedMonths.length} meses</strong>, </>}
                    <strong>{parsedWorkerCount || parsedData.workers.length} trabajadores</strong>,{' '}
                    <strong>{parsedShiftCount || parsedData.totalShiftsCount} entradas de turnos</strong> (Formato:{' '}
                    <span className="uppercase font-mono font-bold">{parsedData.detectedLayout}</span>).
                  </p>
                </div>
              </div>

              {isMultiMonthWorkbook && (
                <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30">
                  <div className="flex items-center justify-between gap-3 border-b border-indigo-200/70 px-4 py-3 dark:border-indigo-800/70">
                    <div className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-100">
                        Meses detectados
                      </h3>
                    </div>
                    <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">
                      {parsedMonths.length} listos
                    </span>
                  </div>
                  <div className="grid gap-px bg-indigo-200/70 dark:bg-indigo-800/70 sm:grid-cols-2">
                    {parsedMonths.map((item) => (
                      <div key={`${item.year}-${item.month}-${item.sourceSheetName}`} className="bg-white/90 px-4 py-3 dark:bg-slate-900/80">
                        <p className="text-xs font-black text-slate-900 dark:text-white">
                          {MONTH_NAMES_ES[item.month - 1]} {item.year}
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                          {item.workers.length} trabajadores · {item.totalShiftsCount} turnos · {item.sourceSheetName}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {skippedBlocks.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-bold">Hay bloques que requieren revisión</p>
                      <p className="mt-1">
                        {skippedBlocks.map((item) => `${MONTH_NAMES_ES[item.month - 1]} ${item.year}`).join(', ')} no se guardarán porque no contienen una estructura válida de trabajadores y turnos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Month Mismatch Alert & Quick Swap Prompt */}
              {!isMultiMonthWorkbook && parsedData.hasMonthMismatch && parsedData.detectedMonthName && (
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
              {parsedOutOfRangeCount > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Ajuste de Días Fuera de Rango</p>
                      <p className="mt-1">
                        Se encontraron {parsedOutOfRangeCount} entradas fuera del rango válido de sus meses.
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
                        <p className="text-[10px] opacity-80">Asignar cada fecha al último día válido de su mes</p>
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
                {isMultiMonthWorkbook && (
                  <p className={`mt-2 text-[11px] font-semibold ${
                    selectedWorkerMonthCount === parsedMonths.length
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    Perfil encontrado en {selectedWorkerMonthCount} de {parsedMonths.length} meses. Los demás trabajadores también se importarán sin mezclarse entre sí.
                  </p>
                )}
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
                        {Object.keys(w.shifts).length} días mapeados a{' '}
                        {MONTH_NAMES_ES[(isMultiMonthWorkbook ? parsedData.month : refMonth) - 1]}{' '}
                        {isMultiMonthWorkbook ? parsedData.year : refYear}
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
                  {willUpdateParsedPeriods ? 'Actualizar' : 'Guardar'}{' '}
                  {isMultiMonthWorkbook
                    ? `${parsedMonths.length} meses`
                    : `${MONTH_NAMES_ES[refMonth - 1]} ${refYear}`}
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

      {pendingReplacement && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="replace-shift-month-title"
            className="w-full max-w-sm rounded-3xl border border-amber-200 bg-white p-5 shadow-2xl dark:border-amber-800 dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3
                  id="replace-shift-month-title"
                  className="text-base font-black text-slate-950 dark:text-white"
                >
                  {replacementPeriods.length === 1 ? 'Mes ya cargado' : 'Meses ya cargados'}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {replacementPeriods
                    .map(
                      (item) =>
                        `${MONTH_NAMES_ES[item.referenceMonth - 1]} ${item.referenceYear}`
                    )
                    .join(', ')}{' '}
                  {replacementPeriods.length === 1 ? 'ya tiene' : 'ya tienen'} turnos. Al continuar se actualizarán únicamente esos meses; los demás turnos y tus citas personales se conservarán.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPendingReplacement(null)}
                className="min-h-11 rounded-xl px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => commitSavedMonths(pendingReplacement, true)}
                className="min-h-11 rounded-xl bg-amber-600 px-3 text-xs font-black text-white shadow-md transition-all hover:bg-amber-500 active:scale-[0.98]"
              >
                {replacementPeriods.length === 1 ? 'Actualizar mes' : 'Actualizar meses'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
