import * as XLSX from 'xlsx';
import { ShiftCategory, ShiftCodeDefinition, WorkerProfile, DayShift, ShiftEntry } from '../types';

export const COMMON_SHIFT_DEFINITIONS: Record<string, ShiftCodeDefinition> = {
  'M': { code: 'M', name: 'Mañana', category: 'morning', defaultStartTime: '08:00', defaultEndTime: '16:00', isWorkDay: true, color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700' },
  'T': { code: 'T', name: 'Tarde', category: 'afternoon', defaultStartTime: '16:00', defaultEndTime: '24:00', isWorkDay: true, color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700' },
  'N': { code: 'N', name: 'Noche', category: 'night', defaultStartTime: '00:00', defaultEndTime: '08:00', isWorkDay: true, color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700' },
  'D': { code: 'D', name: 'Diferido', category: 'morning', defaultStartTime: '10:00', defaultEndTime: '17:00', isWorkDay: true, color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-700' },
  'L': { code: 'L', name: 'Día Libre', category: 'off', defaultStartTime: '', defaultEndTime: '', isWorkDay: false, color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700' },
  'A': { code: 'A', name: 'Administrativo', category: 'administrative', defaultStartTime: '08:45', defaultEndTime: '17:00', isWorkDay: true, color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600' },
  'AV': { code: 'AV', name: 'Administrativo Viernes', category: 'administrative', defaultStartTime: '08:45', defaultEndTime: '16:45', isWorkDay: true, color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600' },
  'MTV': { code: 'MTV', name: 'Mañana Sala TV', category: 'morning', defaultStartTime: '07:00', defaultEndTime: '15:00', isWorkDay: true, color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700' },
  'TTV': { code: 'TTV', name: 'Tarde Sala TV', category: 'afternoon', defaultStartTime: '15:00', defaultEndTime: '23:00', isWorkDay: true, color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700' },
  'ALV': { code: 'ALV', name: 'Administrativo Longovilo', category: 'administrative', defaultStartTime: '08:45', defaultEndTime: '17:15', isWorkDay: true, color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600' },
  'ENL': { code: 'ENL', name: 'Entrante Noche Longovilo', category: 'night', defaultStartTime: '17:00', defaultEndTime: '01:00', isWorkDay: true, color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700' },
  'NLV': { code: 'NLV', name: 'Noche Longovilo', category: 'night', defaultStartTime: '23:00', defaultEndTime: '08:00', isWorkDay: true, color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700' },
  'ENV': { code: 'ENV', name: 'Entrante Noche Viernes Longovilo', category: 'night', defaultStartTime: '16:00', defaultEndTime: '01:00', isWorkDay: true, color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700' },
  'OLV': { code: 'OLV', name: 'Administrativo Viernes Longovilo', category: 'administrative', defaultStartTime: '08:45', defaultEndTime: '16:15', isWorkDay: true, color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600' },
  'X': { code: 'X', name: 'Presencial NOC (CNT)', category: 'administrative', defaultStartTime: '08:30', defaultEndTime: '17:30', isWorkDay: true, color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700' },
};

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function isRealPersonName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim();
  if (clean.length < 2) return false;

  const lower = clean.toLowerCase();

  // Words or phrases that indicate this row is a shift legend, room label, header, or summary row
  const invalidSubstrings = [
    'sala tv',
    'longovilo',
    'presencial noc',
    'noc (cnt)',
    'dia libre',
    'día libre',
    'diferido',
    'entrante noche',
    'saliente noche',
    'adelanto vacaciones',
    'ausencia licencia',
    'licencia medica',
    'licencia médica',
    'administrativo',
    'dotacion',
    'dotación',
    'cobertura',
    'leyenda',
    'resumen',
    'firmas',
    'total',
    'reten',
    'retén',
    'capacitacion',
    'capacitación',
    'turno',
    'horario',
    'acronimo',
    'acrónimo',
  ];

  for (const term of invalidSubstrings) {
    if (lower.includes(term)) return false;
  }

  const invalidExact = new Set([
    'mañana',
    'tarde',
    'noche',
    'libre',
    'descanso',
    'feriado',
    'vacaciones',
    'permiso',
    'viernes',
    'lunes',
    'martes',
    'miércoles',
    'miercoles',
    'jueves',
    'sábado',
    'sabado',
    'domingo',
    'turnos',
    'horarios',
    'noc',
    'cnt',
  ]);

  if (invalidExact.has(lower)) return false;

  // Pattern checks: starts with a shift name (e.g. "Mañana ...", "Tarde ...", "Noche ...", "Administrativo ...")
  if (/^(mañana|tarde|noche|diferido|dia libre|día libre|libre|descanso|administrativo|entrante|saliente|presencial)\b/i.test(clean)) {
    return false;
  }

  // Time format in name (e.g. "08:00 a 16:00")
  if (/\d{1,2}:\d{2}/.test(clean)) return false;

  return true;
}

export function categorizeCode(rawCode: string): ShiftCodeDefinition {
  const clean = rawCode?.toString().trim().toUpperCase() || 'L';
  if (COMMON_SHIFT_DEFINITIONS[clean]) {
    return COMMON_SHIFT_DEFINITIONS[clean];
  }

  // Fallback categorization heuristics
  if (clean.includes('M')) {
    return { code: clean, name: `Mañana (${clean})`, category: 'morning', defaultStartTime: '08:00', defaultEndTime: '16:00', isWorkDay: true, color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700' };
  }
  if (clean.includes('T')) {
    return { code: clean, name: `Tarde (${clean})`, category: 'afternoon', defaultStartTime: '16:00', defaultEndTime: '24:00', isWorkDay: true, color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700' };
  }
  if (clean.includes('N')) {
    return { code: clean, name: `Noche (${clean})`, category: 'night', defaultStartTime: '00:00', defaultEndTime: '08:00', isWorkDay: true, color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700' };
  }
  if (clean.includes('A')) {
    return { code: clean, name: `Administrativo (${clean})`, category: 'administrative', defaultStartTime: '08:45', defaultEndTime: '17:00', isWorkDay: true, color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600' };
  }
  if (clean.includes('L') || clean.includes('D') || clean.includes('VAC') || clean.includes('FER')) {
    return { code: clean, name: `Libre (${clean})`, category: 'off', defaultStartTime: '', defaultEndTime: '', isWorkDay: false, color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700' };
  }

  return { code: clean, name: `Turno ${clean}`, category: 'other', defaultStartTime: '08:00', defaultEndTime: '16:00', isWorkDay: true, color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700' };
}

export function syncWorkersShiftTimes(workersList: WorkerProfile[]): WorkerProfile[] {
  if (!workersList || !Array.isArray(workersList)) return [];
  return workersList.map((worker) => {
    let modified = false;
    const updatedShifts = { ...worker.shifts };

    Object.keys(updatedShifts).forEach((dateKey) => {
      const shift = updatedShifts[dateKey];
      if (shift && shift.rawCode) {
        const def = categorizeCode(shift.rawCode);
        if (def && def.isWorkDay) {
          if (
            shift.startTime !== def.defaultStartTime ||
            shift.endTime !== def.defaultEndTime ||
            shift.category !== def.category
          ) {
            updatedShifts[dateKey] = {
              ...shift,
              startTime: def.defaultStartTime,
              endTime: def.defaultEndTime,
              category: def.category,
              isWorkDay: def.isWorkDay,
            };
            modified = true;
          }
        }
      }
    });

    return modified ? { ...worker, shifts: updatedShifts } : worker;
  });
}

export function parseWeekdayToNumber(str: string): number | null {
  if (!str) return null;
  const clean = str.trim().toLowerCase();
  if (clean.startsWith('d') || clean.startsWith('dom')) return 0; // Sun
  if (clean.startsWith('l') || clean.startsWith('lun')) return 1; // Mon
  if (clean.startsWith('ma') || clean.startsWith('mar')) return 2; // Tue
  if (clean.startsWith('mi') || clean.startsWith('mie') || clean.startsWith('mié')) return 3; // Wed
  if (clean === 'm') return 2; // Default M to Martes or Miércoles
  if (clean.startsWith('j') || clean.startsWith('jue')) return 4; // Thu
  if (clean.startsWith('v') || clean.startsWith('vie')) return 5; // Fri
  if (clean.startsWith('s') || clean.startsWith('sab') || clean.startsWith('sáb')) return 6; // Sat
  return null;
}

export function detectMonthAndYearFromRows(rows: any[][]): {
  detectedMonth: number | null;
  detectedYear: number | null;
  detectedMonthName: string | null;
} {
  const monthRegexes: { month: number; name: string; pattern: RegExp }[] = [
    { month: 1, name: 'Enero', pattern: /\b(enero|january|jan)\b/i },
    { month: 2, name: 'Febrero', pattern: /\b(febrero|february|feb)\b/i },
    { month: 3, name: 'Marzo', pattern: /\b(marzo|march|mar)\b/i },
    { month: 4, name: 'Abril', pattern: /\b(abril|april|apr)\b/i },
    { month: 5, name: 'Mayo', pattern: /\b(mayo|may)\b/i },
    { month: 6, name: 'Junio', pattern: /\b(junio|june|jun)\b/i },
    { month: 7, name: 'Julio', pattern: /\b(julio|july|jul)\b/i },
    { month: 8, name: 'Agosto', pattern: /\b(agosto|august|aug)\b/i },
    { month: 9, name: 'Septiembre', pattern: /\b(septiembre|septimebre|september|sep|sept)\b/i },
    { month: 10, name: 'Octubre', pattern: /\b(octubre|october|oct)\b/i },
    { month: 11, name: 'Noviembre', pattern: /\b(noviembre|november|nov)\b/i },
    { month: 12, name: 'Diciembre', pattern: /\b(diciembre|december|dec)\b/i },
  ];

  let detectedMonth: number | null = null;
  let detectedYear: number | null = null;
  let detectedMonthName: string | null = null;

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    if (!row) continue;
    const rowText = row.map((cell) => cell?.toString() || '').join(' ');

    // Check year
    const yearMatch = rowText.match(/\b(202[4-9]|203[0-9])\b/);
    if (yearMatch && !detectedYear) {
      detectedYear = parseInt(yearMatch[1], 10);
    }

    // Check month
    for (const m of monthRegexes) {
      if (m.pattern.test(rowText) && !detectedMonth) {
        detectedMonth = m.month;
        detectedMonthName = m.name;
        break;
      }
    }

    // Check numeric pattern like 8/2026 or 08/2026
    const numericMonthMatch = rowText.match(/\b(0?[1-9]|1[0-2])\s*[\/\-]\s*(202[4-9]|203[0-9])\b/);
    if (numericMonthMatch) {
      const parsedM = parseInt(numericMonthMatch[1], 10);
      const parsedY = parseInt(numericMonthMatch[2], 10);
      if (!detectedMonth) {
        detectedMonth = parsedM;
        detectedMonthName = MONTH_NAMES_ES[parsedM - 1];
      }
      if (!detectedYear) {
        detectedYear = parsedY;
      }
    }

    if (detectedMonth && detectedYear) break;
  }

  return { detectedMonth, detectedYear, detectedMonthName };
}

export type OutOfRangePolicy = 'remap_last_day' | 'ignore' | 'keep';

export interface ValidateAndMapOptions {
  referenceMonth: number; // 1-12
  referenceYear: number;
  outOfRangePolicy?: OutOfRangePolicy;
}

export interface ValidateAndMapResult {
  validShiftsMap: Record<string, DayShift>;
  shiftEntries: ShiftEntry[];
  outOfRangeDays: { dayNumber: number; rawCode: string }[];
  maxDaysInMonth: number;
}

export function validateAndMapEntries(
  rawEntries: { dayNumber: number; rawCode: string; colIndex?: number; rowIndex?: number; weekdayLabel?: string }[],
  options: ValidateAndMapOptions
): ValidateAndMapResult {
  const { referenceMonth, referenceYear, outOfRangePolicy = 'remap_last_day' } = options;
  const maxDaysInMonth = new Date(referenceYear, referenceMonth, 0).getDate();

  const validShiftsMap: Record<string, DayShift> = {};
  const shiftEntries: ShiftEntry[] = [];
  const outOfRangeDays: { dayNumber: number; rawCode: string }[] = [];

  rawEntries.forEach((item) => {
    let effectiveDay = item.dayNumber;

    if (item.dayNumber > maxDaysInMonth) {
      outOfRangeDays.push({ dayNumber: item.dayNumber, rawCode: item.rawCode });

      if (outOfRangePolicy === 'ignore') {
        return; // Skip this day
      } else if (outOfRangePolicy === 'remap_last_day') {
        effectiveDay = maxDaysInMonth; // Remap day 31 to day 30 for 30-day months
      }
    }

    const formattedMonth = referenceMonth.toString().padStart(2, '0');
    const formattedDay = effectiveDay.toString().padStart(2, '0');
    const dateStr = `${referenceYear}-${formattedMonth}-${formattedDay}`;

    if (validShiftsMap[dateStr] && item.dayNumber > maxDaysInMonth) {
      return;
    }

    const def = categorizeCode(item.rawCode);

    const dayShift: DayShift = {
      date: dateStr,
      rawCode: def.code,
      category: def.category,
      startTime: def.defaultStartTime,
      endTime: def.defaultEndTime,
      isWorkDay: def.isWorkDay,
      isRemote: true,
    };

    validShiftsMap[dateStr] = dayShift;

    shiftEntries.push({
      code: def.code,
      category: def.category,
      dayNumber: effectiveDay,
      weekdayLabel: item.weekdayLabel,
      columnIndex: item.colIndex,
      rowIndex: item.rowIndex,
      shiftDate: dateStr,
    });
  });

  return {
    validShiftsMap,
    shiftEntries,
    outOfRangeDays,
    maxDaysInMonth,
  };
}

export interface ParseExcelResult {
  workers: WorkerProfile[];
  year: number;
  month: number; // 1-12
  totalShiftsCount: number;
  detectedMonth?: number | null;
  detectedYear?: number | null;
  detectedMonthName?: string | null;
  detectedLayout: 'matrix' | 'simple';
  sourceSheetName: string;
  outOfRangeDaysCount: number;
  hasMonthMismatch: boolean;
}

export async function parseExcelBuffer(
  buffer: ArrayBuffer,
  targetYear?: number,
  targetMonth?: number,
  outOfRangePolicy: OutOfRangePolicy = 'ignore'
): Promise<ParseExcelResult> {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  // CRITICAL FIX: defval: '' guarantees row array indices align 1:1 with Excel columns A=0, B=1, C=2...
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rows || rows.length === 0) {
    throw new Error('El archivo Excel se encuentra vacío.');
  }

  // Detect month / year from explicit text in rows
  let { detectedMonth, detectedYear, detectedMonthName } = detectMonthAndYearFromRows(rows);

  // Scan rows for headers that indicate days of the month (1 to 28/31)
  let headerRowIndex = -1;
  let dayColumnIndices: { day: number; colIndex: number; weekdayLabel?: string }[] = [];
  let nameColIndex = 0;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    if (!row) continue;

    const detectedDays: { day: number; colIndex: number; weekdayLabel?: string }[] = [];
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val !== undefined && val !== null && val !== '') {
        let numVal: number | null = null;

        if (val instanceof Date) {
          numVal = val.getDate();
        } else {
          const strVal = val.toString().trim();
          if (/^\d{1,2}$/.test(strVal)) {
            const parsed = parseInt(strVal, 10);
            if (parsed >= 1 && parsed <= 31) {
              numVal = parsed;
            }
          } else if (strVal.includes('/') || strVal.includes('-')) {
            const match = strVal.match(/^(0?[1-9]|[12][0-9]|3[01])[\/\-]/);
            if (match) {
              numVal = parseInt(match[1], 10);
            }
          }
        }

        if (numVal !== null && numVal >= 1 && numVal <= 31) {
          let weekdayLabel: string | undefined = undefined;
          if (r > 0 && rows[r - 1] && rows[r - 1][c]) {
            weekdayLabel = rows[r - 1][c]?.toString().trim();
          } else if (r + 1 < rows.length && rows[r + 1] && rows[r + 1][c]) {
            weekdayLabel = rows[r + 1][c]?.toString().trim();
          }
          detectedDays.push({ day: numVal, colIndex: c, weekdayLabel });
        }
      }
    }

    if (detectedDays.length >= 5) {
      // Find contiguous sequence of increasing days (1, 2, 3...) to eliminate stray ID or summary columns
      const sortedByCol = [...detectedDays].sort((a, b) => a.colIndex - b.colIndex);
      let bestSeq: typeof sortedByCol = [];

      for (let i = 0; i < sortedByCol.length; i++) {
        const startItem = sortedByCol[i];
        if (startItem.day > 5) continue;

        const currentSeq = [startItem];
        let lastDay = startItem.day;

        for (let j = i + 1; j < sortedByCol.length; j++) {
          const item = sortedByCol[j];
          if (item.day === lastDay + 1) {
            currentSeq.push(item);
            lastDay = item.day;
          }
        }

        if (currentSeq.length > bestSeq.length) {
          bestSeq = currentSeq;
        }
      }

      if (bestSeq.length >= 5) {
        dayColumnIndices = bestSeq.sort((a, b) => a.day - b.day);
      } else {
        // Deduplicate by picking first occurrence per day
        const dayMap = new Map<number, { day: number; colIndex: number; weekdayLabel?: string }>();
        sortedByCol.forEach((item) => {
          if (!dayMap.has(item.day)) {
            dayMap.set(item.day, item);
          }
        });
        dayColumnIndices = Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
      }

      headerRowIndex = r;
      break;
    }
  }

  const now = new Date();

  // If month wasn't detected from text, attempt detection via weekday of Day 1 (e.g. Day 1 = Sáb -> August in 2026)
  if (!detectedMonth && dayColumnIndices.length >= 3) {
    const day1Obj = dayColumnIndices.find((d) => d.day === 1);
    if (day1Obj && day1Obj.weekdayLabel) {
      const expectedDay1OfWeek = parseWeekdayToNumber(day1Obj.weekdayLabel);
      if (expectedDay1OfWeek !== null) {
        const checkYear = targetYear || detectedYear || now.getFullYear();
        for (let m = 1; m <= 12; m++) {
          if (new Date(checkYear, m - 1, 1).getDay() === expectedDay1OfWeek) {
            detectedMonth = m;
            detectedMonthName = MONTH_NAMES_ES[m - 1];
            if (!detectedYear) detectedYear = checkYear;
            break;
          }
        }
      }
    }
  }

  const year = targetYear || detectedYear || now.getFullYear();
  const month = targetMonth || detectedMonth || (now.getMonth() + 1);

  const hasMonthMismatch = Boolean(
    (detectedMonth && detectedMonth !== month) || (detectedYear && detectedYear !== year)
  );

  const workers: WorkerProfile[] = [];
  let totalShiftsCount = 0;
  let totalOutOfRangeCount = 0;
  let detectedLayout: 'matrix' | 'simple' = 'simple';

  if (headerRowIndex !== -1 && dayColumnIndices.length > 0) {
    detectedLayout = 'matrix';
    // MATRIX FORMAT
    const headerRow = rows[headerRowIndex];
    for (let c = 0; c < (headerRow ? headerRow.length : 5); c++) {
      const cellText = headerRow[c]?.toString().toLowerCase() || '';
      if (cellText.includes('nombre') || cellText.includes('trabajador') || cellText.includes('empleado') || cellText.includes('persona')) {
        nameColIndex = c;
        break;
      }
    }

    const firstDayCol = dayColumnIndices[0]?.colIndex || 2;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;

      // Smart worker name detection from columns prior to day 1
      let workerNameRaw = '';
      for (let c = 0; c < firstDayCol; c++) {
        const cellVal = row[c]?.toString().trim();
        // Skip RUTs, numbers, empty cells, and header words
        if (cellVal && cellVal.length >= 2 && !/^\d+[\d\-kK]*$/.test(cellVal)) {
          const lower = cellVal.toLowerCase();
          if (
            !lower.includes('total') &&
            !lower.includes('firmas') &&
            !lower.includes('nombre') &&
            !lower.includes('trabajador') &&
            !lower.includes('rut')
          ) {
            workerNameRaw = cellVal;
            break;
          }
        }
      }

      if (!workerNameRaw && row[nameColIndex]) {
        workerNameRaw = row[nameColIndex].toString().trim();
      }

      if (!workerNameRaw || !isRealPersonName(workerNameRaw)) continue;

      const rawEntries = dayColumnIndices.map(({ day, colIndex, weekdayLabel }) => ({
        dayNumber: day,
        rawCode: row[colIndex]?.toString().trim() || 'L',
        colIndex,
        rowIndex: r,
        weekdayLabel,
      }));

      const { validShiftsMap, shiftEntries, outOfRangeDays } = validateAndMapEntries(rawEntries, {
        referenceMonth: month,
        referenceYear: year,
        outOfRangePolicy,
      });

      totalShiftsCount += shiftEntries.length;
      totalOutOfRangeCount += outOfRangeDays.length;

      const workerId = `w_${r}_${workerNameRaw.replace(/\s+/g, '_').toLowerCase()}`;

      workers.push({
        id: workerId,
        name: workerNameRaw,
        role: 'Operador / Técnico',
        department: 'Operaciones',
        shifts: validShiftsMap,
        shiftEntries,
        referenceMonth: month,
        referenceYear: year,
        importMetadata: {
          sourceFileName: firstSheetName,
          sheetName: firstSheetName,
          detectedLayout: 'matrix',
          importedAt: new Date().toISOString(),
        },
      });
    }
  } else {
    // SIMPLE ROW FORMAT (Fallback)
    detectedLayout = 'simple';
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length < 2) continue;

      const nameCell = row[0]?.toString().trim();
      if (!nameCell || nameCell.length < 2 || nameCell.toLowerCase().includes('nombre') || nameCell.toLowerCase().includes('fecha')) {
        continue;
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      const rawEntries: { dayNumber: number; rawCode: string; colIndex?: number; rowIndex?: number }[] = [];

      let dayCounter = 1;
      for (let c = 1; c < row.length && dayCounter <= daysInMonth; c++) {
        const rawCode = row[c]?.toString().trim();
        if (!rawCode) continue;
        rawEntries.push({
          dayNumber: dayCounter,
          rawCode,
          colIndex: c,
          rowIndex: r,
        });
        dayCounter++;
      }

      if (rawEntries.length > 0) {
        const { validShiftsMap, shiftEntries, outOfRangeDays } = validateAndMapEntries(rawEntries, {
          referenceMonth: month,
          referenceYear: year,
          outOfRangePolicy,
        });

        totalShiftsCount += shiftEntries.length;
        totalOutOfRangeCount += outOfRangeDays.length;

        const workerId = `w_simple_${r}_${nameCell.replace(/\s+/g, '_').toLowerCase()}`;

        workers.push({
          id: workerId,
          name: nameCell,
          role: 'Personal de Turno',
          department: 'Servicios',
          shifts: validShiftsMap,
          shiftEntries,
          referenceMonth: month,
          referenceYear: year,
          importMetadata: {
            sourceFileName: firstSheetName,
            sheetName: firstSheetName,
            detectedLayout: 'simple',
            importedAt: new Date().toISOString(),
          },
        });
      }
    }
  }

  if (workers.length === 0) {
    throw new Error('No se detectaron datos válidos de trabajadores en la planilla Excel.');
  }

  return {
    workers,
    year,
    month,
    totalShiftsCount,
    detectedMonth,
    detectedYear,
    detectedMonthName,
    detectedLayout,
    sourceSheetName: firstSheetName,
    outOfRangeDaysCount: totalOutOfRangeCount,
    hasMonthMismatch,
  };
}

export function generateSampleExcelBuffer(): Uint8Array {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const headers = ['Trabajador / Día'];
  for (let d = 1; d <= daysInMonth; d++) {
    headers.push(d.toString());
  }

  const sampleWorkerNames = [
    'Juan Pérez',
    'María González',
    'Carlos Silva',
    'Ana Rodríguez',
    'Diego Morales',
    'Sofia Castro',
    'Luis Fernández',
    'Patricia Vera',
  ];

  const shiftPattern = ['M', 'M', 'T', 'T', 'N', 'N', 'L', 'L'];

  const rows: any[][] = [
    [`PROGRAMACIÓN DE TURNOS - ${MONTH_NAMES_ES[month - 1].toUpperCase()} ${year}`],
    [],
    headers,
  ];

  sampleWorkerNames.forEach((name, idx) => {
    const row: any[] = [name];
    for (let d = 1; d <= daysInMonth; d++) {
      const code = shiftPattern[(d + idx * 2) % shiftPattern.length];
      row.push(code);
    }
    rows.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Turnos');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

export function generateSampleDemoWorkers(): WorkerProfile[] {
  const year = 2026;
  const month = 8; // Agosto 2026
  const daysInMonth = 31;

  const realWorkersData = [
    {
      name: 'Esteban Varas Varela',
      role: 'Operador / Técnico',
      dept: 'Operaciones',
      codes: ['T','T','T','L','L','N','N','M','M','A','M','M','L','L','T','T','T','L','L','N','N','M','M','A','M','M','L','L','T','T','T']
    },
    {
      name: 'Elena Aguilera',
      role: 'Supervisora de Turno',
      dept: 'Jefatura',
      codes: ['L','L','L','D','T','L','M','M','M','D','L','M','M','M','D','L','M','M','M','D','L','M','M','M','D','L','M','M','M','D','L']
    },
    {
      name: 'Juan Poblete',
      role: 'Técnico de Terreno',
      dept: 'Mantenimiento',
      codes: ['N','N','N','T','T','T','L','L','L','L','D','T','L','N','N','N','T','T','T','L','L','L','L','D','T','L','N','N','N','T','T']
    },
    {
      name: 'Santiago Armijo',
      role: 'Analista de Control',
      dept: 'Planificación',
      codes: ['N','N','N','T','A','M','M','L','L','M','A','T','T','N','N','N','T','A','M','M','L','L','M','A','T','T','N','N','N','T','A']
    },
    {
      name: 'Sergio Palma',
      role: 'Operador Especialista',
      dept: 'Operaciones',
      codes: ['M','M','A','M','M','L','L','N','N','N','T','A','M','M','M','M','A','M','M','L','L','N','N','N','T','A','M','M','M','M','A']
    },
    {
      name: 'Victor Muñoz Cabrera',
      role: 'Soporte de Campo',
      dept: 'Servicios',
      codes: ['N','N','N','T','T','T','L','L','L','L','D','T','L','N','N','N','T','T','T','L','L','L','L','D','T','L','N','N','N','T','T']
    }
  ];

  return realWorkersData.map((w, idx) => {
    const shifts: Record<string, DayShift> = {};
    const shiftEntries: ShiftEntry[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const code = w.codes[(d - 1) % w.codes.length] || 'L';
      const formattedMonth = month.toString().padStart(2, '0');
      const formattedDay = d.toString().padStart(2, '0');
      const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

      const def = categorizeCode(code);
      shifts[dateStr] = {
        date: dateStr,
        rawCode: def.code,
        category: def.category,
        startTime: def.defaultStartTime,
        endTime: def.defaultEndTime,
        isWorkDay: def.isWorkDay,
        isRemote: true,
      };

      shiftEntries.push({
        code: def.code,
        category: def.category,
        dayNumber: d,
        shiftDate: dateStr,
      });
    }

    return {
      id: `worker_${idx}_${w.name.replace(/\s+/g, '_').toLowerCase()}`,
      name: w.name,
      role: w.role,
      department: w.dept,
      shifts,
      shiftEntries,
      referenceMonth: month,
      referenceYear: year,
      importMetadata: {
        sourceFileName: 'Planilla_Agosto_2026.xlsx',
        sheetName: 'Turnos',
        detectedLayout: 'matrix',
        importedAt: new Date().toISOString(),
      },
    };
  });
}
