import { AppSettings, WorkerProfile, PersonalEvent, HorarioEvidence } from '../types';

const MAX_BACKUP_CHARACTERS = 10_000_000;
const MAX_WORKERS = 5_000;
const MAX_EVENTS = 10_000;
const MAX_EVIDENCE_ITEMS = 2_000;

const SHIFT_CATEGORIES = new Set([
  'morning',
  'afternoon',
  'night',
  'off',
  'administrative',
  'vacation',
  'other',
]);
const EVENT_TYPES = new Set(['medical', 'gym', 'family', 'study', 'work', 'other']);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/;

type BackupData = {
  settings?: AppSettings;
  workers?: WorkerProfile[];
  events?: PersonalEvent[];
  evidence?: HorarioEvidence[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

const isOptionalBoolean = (value: unknown): value is boolean | undefined =>
  value === undefined || typeof value === 'boolean';

const isValidMonth = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 12;

const isValidYear = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 1900 && Number(value) <= 2200;

const isDayShift = (value: unknown, dateKey: string): boolean => {
  if (!isRecord(value)) return false;

  return (
    value.date === dateKey &&
    ISO_DATE_PATTERN.test(dateKey) &&
    typeof value.rawCode === 'string' &&
    value.rawCode.length <= 30 &&
    typeof value.category === 'string' &&
    SHIFT_CATEGORIES.has(value.category) &&
    typeof value.isWorkDay === 'boolean' &&
    isOptionalString(value.startTime) &&
    (value.startTime === undefined || TIME_PATTERN.test(value.startTime)) &&
    isOptionalString(value.endTime) &&
    (value.endTime === undefined || TIME_PATTERN.test(value.endTime)) &&
    isOptionalBoolean(value.isRemote) &&
    isOptionalString(value.notes) &&
    isOptionalBoolean(value.editedManually)
  );
};

const isShiftEntry = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  return (
    typeof value.code === 'string' &&
    typeof value.category === 'string' &&
    SHIFT_CATEGORIES.has(value.category) &&
    Number.isInteger(value.dayNumber) &&
    Number(value.dayNumber) >= 1 &&
    Number(value.dayNumber) <= 31 &&
    typeof value.shiftDate === 'string' &&
    ISO_DATE_PATTERN.test(value.shiftDate) &&
    isOptionalString(value.weekdayLabel) &&
    (value.columnIndex === undefined || Number.isInteger(value.columnIndex)) &&
    (value.rowIndex === undefined || Number.isInteger(value.rowIndex)) &&
    isOptionalString(value.sourceSheet)
  );
};

const isWorkerProfile = (value: unknown): value is WorkerProfile => {
  if (!isRecord(value) || !isRecord(value.shifts)) return false;
  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    value.id.length > 300 ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    value.name.length > 300 ||
    !isOptionalString(value.role) ||
    !isOptionalString(value.department)
  ) {
    return false;
  }

  if (!Object.entries(value.shifts).every(([date, shift]) => isDayShift(shift, date))) {
    return false;
  }

  if (
    value.shiftEntries !== undefined &&
    (!Array.isArray(value.shiftEntries) ||
      value.shiftEntries.length > 5_000 ||
      !value.shiftEntries.every(isShiftEntry))
  ) {
    return false;
  }

  if (value.referenceMonth !== undefined && !isValidMonth(value.referenceMonth)) return false;
  if (value.referenceYear !== undefined && !isValidYear(value.referenceYear)) return false;

  if (value.importMetadata !== undefined) {
    if (!isRecord(value.importMetadata)) return false;
    if (
      !isOptionalString(value.importMetadata.sourceFileName) ||
      !isOptionalString(value.importMetadata.sheetName) ||
      !isOptionalString(value.importMetadata.importedAt) ||
      (value.importMetadata.detectedLayout !== undefined &&
        value.importMetadata.detectedLayout !== 'matrix' &&
        value.importMetadata.detectedLayout !== 'simple')
    ) {
      return false;
    }
  }

  return true;
};

const isPersonalEvent = (value: unknown): value is PersonalEvent => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 300 &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    value.title.length <= 500 &&
    typeof value.type === 'string' &&
    EVENT_TYPES.has(value.type) &&
    typeof value.date === 'string' &&
    ISO_DATE_PATTERN.test(value.date) &&
    typeof value.startTime === 'string' &&
    TIME_PATTERN.test(value.startTime) &&
    typeof value.endTime === 'string' &&
    TIME_PATTERN.test(value.endTime) &&
    Number.isInteger(value.reminderMinutes) &&
    Number(value.reminderMinutes) >= 0 &&
    Number(value.reminderMinutes) <= 525_600 &&
    isOptionalString(value.notes) &&
    isOptionalBoolean(value.suspendedConflict)
  );
};

const isEvidenceItem = (value: unknown): value is HorarioEvidence => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 300 &&
    typeof value.fileName === 'string' &&
    value.fileName.length > 0 &&
    value.fileName.length <= 500 &&
    typeof value.fileSizeMb === 'number' &&
    Number.isFinite(value.fileSizeMb) &&
    value.fileSizeMb >= 0 &&
    value.fileSizeMb <= 8 &&
    (value.fileType === 'image' || value.fileType === 'pdf') &&
    typeof value.uploadDate === 'string' &&
    value.uploadDate.length <= 100 &&
    isOptionalString(value.previewUrl) &&
    isOptionalString(value.storageKey) &&
    isOptionalString(value.extractedNotes)
  );
};

export const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'es',
  userRole: 'worker',
  activeWorkerId: undefined,
  activeView: 'home',
  hasSeenSplash: false,
  remindersEnabled: true,
  defaultRemoteMode: true,
  dismissedConflicts: [],
  shiftImports: [],
};

const sanitizeSettings = (value: unknown): AppSettings | null => {
  if (!isRecord(value)) return null;

  const settings: AppSettings = { ...defaultSettings };

  if (value.theme !== undefined) {
    if (value.theme !== 'light' && value.theme !== 'dark' && value.theme !== 'system') return null;
    settings.theme = value.theme;
  }
  if (value.language !== undefined) {
    if (value.language !== 'es' && value.language !== 'en' && value.language !== 'pt') return null;
    settings.language = value.language;
  }
  if (value.userRole !== undefined) {
    if (value.userRole !== 'worker' && value.userRole !== 'supervisor') return null;
    settings.userRole = value.userRole;
  }
  if (value.activeWorkerId !== undefined) {
    if (typeof value.activeWorkerId !== 'string' || value.activeWorkerId.length > 300) return null;
    settings.activeWorkerId = value.activeWorkerId;
  }
  if (value.activeView !== undefined) {
    if (!['home', 'shifts', 'personal', 'supervisor'].includes(String(value.activeView))) return null;
    settings.activeView = value.activeView as AppSettings['activeView'];
  }
  if (value.hasSeenSplash !== undefined) {
    if (typeof value.hasSeenSplash !== 'boolean') return null;
    settings.hasSeenSplash = value.hasSeenSplash;
  }
  if (value.remindersEnabled !== undefined) {
    if (typeof value.remindersEnabled !== 'boolean') return null;
    settings.remindersEnabled = value.remindersEnabled;
  }
  if (value.defaultRemoteMode !== undefined) {
    if (typeof value.defaultRemoteMode !== 'boolean') return null;
    settings.defaultRemoteMode = value.defaultRemoteMode;
  }
  if (value.dismissedConflicts !== undefined) {
    if (
      !Array.isArray(value.dismissedConflicts) ||
      value.dismissedConflicts.length > MAX_EVENTS ||
      !value.dismissedConflicts.every((item) => typeof item === 'string' && item.length <= 300)
    ) {
      return null;
    }
    settings.dismissedConflicts = value.dismissedConflicts;
  }
  if (value.referenceMonth !== undefined) {
    if (!isValidMonth(value.referenceMonth)) return null;
    settings.referenceMonth = value.referenceMonth;
  }
  if (value.referenceYear !== undefined) {
    if (!isValidYear(value.referenceYear)) return null;
    settings.referenceYear = value.referenceYear;
  }
  if (value.shiftImports !== undefined) {
    if (
      !Array.isArray(value.shiftImports) ||
      value.shiftImports.length > 120 ||
      !value.shiftImports.every(
        (item) =>
          isRecord(item) &&
          typeof item.key === 'string' &&
          item.key.length <= 30 &&
          isValidMonth(item.month) &&
          isValidYear(item.year) &&
          typeof item.sourceFileName === 'string' &&
          item.sourceFileName.length <= 500 &&
          typeof item.importedAt === 'string' &&
          item.importedAt.length <= 100
      )
    ) {
      return null;
    }
    settings.shiftImports = value.shiftImports as AppSettings['shiftImports'];
  }

  return settings;
};

const parseBackupData = (jsonString: string): BackupData | null => {
  if (!jsonString.trim() || jsonString.length > MAX_BACKUP_CHARACTERS) return null;

  try {
    const data: unknown = JSON.parse(jsonString, (key, value) => {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        throw new Error('Unsafe backup property.');
      }
      return value;
    });

    if (!isRecord(data)) return null;

    const hasSupportedSection = ['settings', 'workers', 'events', 'evidence'].some(
      (key) => data[key] !== undefined
    );
    if (!hasSupportedSection) return null;

    const result: BackupData = {};

    if (data.settings !== undefined) {
      const settings = sanitizeSettings(data.settings);
      if (!settings) return null;
      result.settings = settings;
    }

    if (data.workers !== undefined) {
      if (
        !Array.isArray(data.workers) ||
        data.workers.length > MAX_WORKERS ||
        !data.workers.every(isWorkerProfile)
      ) {
        return null;
      }
      result.workers = data.workers;
    }

    if (data.events !== undefined) {
      if (
        !Array.isArray(data.events) ||
        data.events.length > MAX_EVENTS ||
        !data.events.every(isPersonalEvent)
      ) {
        return null;
      }
      result.events = data.events;
    }

    if (data.evidence !== undefined) {
      if (
        !Array.isArray(data.evidence) ||
        data.evidence.length > MAX_EVIDENCE_ITEMS ||
        !data.evidence.every(isEvidenceItem)
      ) {
        return null;
      }
      result.evidence = data.evidence;
    }

    return result;
  } catch (error) {
    console.error('Invalid backup JSON:', error);
    return null;
  }
};

const buildUserKeys = (userId: string) => {
  const owner = encodeURIComponent(userId);
  return {
    settings: `turnofly_user_${owner}_settings_v1`,
    workers: `turnofly_user_${owner}_workers_v1`,
    events: `turnofly_user_${owner}_events_v1`,
    evidence: `turnofly_user_${owner}_evidence_v1`,
  } as const;
};

export const createUserStorage = (userId: string) => {
  if (!userId.trim()) {
    throw new Error('A user id is required to access TurnoFly storage.');
  }

  const keys = buildUserKeys(userId);

  return {
    getSettings(): AppSettings {
      try {
        const data = localStorage.getItem(keys.settings);
        return data ? { ...defaultSettings, ...JSON.parse(data) } : { ...defaultSettings };
      } catch {
        return { ...defaultSettings };
      }
    },

    saveSettings(settings: AppSettings): void {
      try {
        localStorage.setItem(keys.settings, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving settings to storage:', error);
      }
    },

    getWorkers(): WorkerProfile[] {
      try {
        const data = localStorage.getItem(keys.workers);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },

    saveWorkers(workers: WorkerProfile[]): void {
      try {
        localStorage.setItem(keys.workers, JSON.stringify(workers));
      } catch (error) {
        console.error('Error saving workers to storage:', error);
      }
    },

    getEvents(): PersonalEvent[] {
      try {
        const data = localStorage.getItem(keys.events);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },

    saveEvents(events: PersonalEvent[]): void {
      try {
        localStorage.setItem(keys.events, JSON.stringify(events));
      } catch (error) {
        console.error('Error saving events to storage:', error);
      }
    },

    getEvidence(): HorarioEvidence[] {
      try {
        const data = localStorage.getItem(keys.evidence);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },

    saveEvidence(evidence: HorarioEvidence[]): void {
      try {
        localStorage.setItem(keys.evidence, JSON.stringify(evidence));
      } catch (error) {
        console.error('Error saving evidence to storage:', error);
      }
    },

    clearShiftsOnly(): void {
      try {
        localStorage.removeItem(keys.workers);
        const settings = this.getSettings();
        settings.activeWorkerId = undefined;
        this.saveSettings(settings);
      } catch (error) {
        console.error('Error clearing shifts:', error);
      }
    },

    resetFullApp(): void {
      try {
        Object.values(keys).forEach((key) => localStorage.removeItem(key));
      } catch (error) {
        console.error('Error resetting app:', error);
      }
    },

    exportBackupData(): string {
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: this.getSettings(),
        workers: this.getWorkers(),
        events: this.getEvents(),
        evidence: this.getEvidence(),
      };
      return JSON.stringify(backup, null, 2);
    },

    importBackupData(jsonString: string): boolean {
      const data = parseBackupData(jsonString);
      if (!data) return false;

      if (data.settings) this.saveSettings(data.settings);
      if (data.workers) this.saveWorkers(data.workers);
      if (data.events) this.saveEvents(data.events);
      if (data.evidence) this.saveEvidence(data.evidence);
      return true;
    },
  };
};

export type UserStorage = ReturnType<typeof createUserStorage>;
