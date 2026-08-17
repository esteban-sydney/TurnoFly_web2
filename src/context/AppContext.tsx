import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  AppSettings,
  WorkerProfile,
  PersonalEvent,
  HorarioEvidence,
  ConflictAlert,
  Language,
  ThemeMode,
  UserRole,
  DayShift,
  ImportedWorkerMonth,
  ShiftPeriod,
} from '../types';
import { createUserStorage, defaultSettings } from '../utils/storage';
import { FileStore } from '../utils/fileStore';
import { detectScheduleConflicts } from '../utils/conflictDetector';
import {
  generateSampleDemoWorkers,
  COMMON_SHIFT_DEFINITIONS,
  hydrateShiftDefinitionsFromWorkers,
  isRealPersonName,
  syncWorkersShiftTimes,
} from '../utils/excelParser';
import {
  mergeImportedWorkersForPeriod,
  resolveImportedWorkerId,
} from '../utils/workerImportMerge';

interface AppContextType {
  settings: AppSettings;
  workers: WorkerProfile[];
  events: PersonalEvent[];
  evidence: HorarioEvidence[];
  activeWorker: WorkerProfile | undefined;
  conflicts: ConflictAlert[];
  activeYear: number;
  activeMonth: number;
  availableShiftPeriods: ShiftPeriod[];
  
  // Actions
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setUserRole: (role: UserRole) => void;
  setActiveWorkerId: (id: string | undefined) => void;
  setActiveYearMonth: (year: number, month: number) => void;
  setLastActiveView: (view: 'home' | 'shifts' | 'personal' | 'supervisor') => void;
  markSplashSeen: () => void;
  
  // Data mutations
  loadImportedWorkers: (
    newWorkers: WorkerProfile[],
    selectedWorkerId?: string,
    referenceYear?: number,
    referenceMonth?: number
  ) => void;
  loadImportedWorkerMonths: (imports: ImportedWorkerMonth[]) => void;
  updateDayShift: (workerId: string, dateStr: string, updatedShift: Partial<DayShift>) => void;
  updateShiftDefinition: (
    code: string,
    newStartTime: string,
    newEndTime: string,
    isWorkDay: boolean,
    name?: string
  ) => void;
  
  // Events
  addPersonalEvent: (event: Omit<PersonalEvent, 'id'>) => void;
  updatePersonalEvent: (event: PersonalEvent) => void;
  deletePersonalEvent: (eventId: string) => void;
  
  // Evidence
  addEvidence: (item: HorarioEvidence) => void;
  deleteEvidence: (id: string) => void;
  
  // Resets
  clearShiftsOnly: () => void;
  resetFullApp: () => void;
  exportBackup: () => string;
  importBackup: (jsonStr: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode; userId: string }> = ({ children, userId }) => {
  const storage = useMemo(() => createUserStorage(userId), [userId]);
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [workers, setWorkers] = useState<WorkerProfile[]>(() => {
    const saved = storage.getWorkers();
    if (saved && saved.length > 0) {
      const sanitized = saved.filter((w) => isRealPersonName(w.name));
      if (sanitized.length > 0) {
        hydrateShiftDefinitionsFromWorkers(sanitized);
        const synced = syncWorkersShiftTimes(sanitized);
        storage.saveWorkers(synced);
        return synced;
      }
    }
    return [];
  });
  const [events, setEvents] = useState<PersonalEvent[]>(() => storage.getEvents());
  const [evidence, setEvidence] = useState<HorarioEvidence[]>(() => storage.getEvidence());

  const [activeYear, setActiveYear] = useState<number>(() => {
    return settings.referenceYear || workers[0]?.referenceYear || new Date().getFullYear();
  });
  const [activeMonth, setActiveMonth] = useState<number>(() => {
    return settings.referenceMonth || workers[0]?.referenceMonth || new Date().getMonth() + 1;
  });

  // Sync dark/light theme class to document Element
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    let isDark = false;

    if (settings.theme === 'dark') {
      isDark = true;
    } else if (settings.theme === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }

  }, [settings]);

  // Sync state changes to storage
  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings, storage]);

  useEffect(() => {
    storage.saveWorkers(workers);
  }, [workers, storage]);

  useEffect(() => {
    storage.saveEvents(events);
  }, [events, storage]);

  useEffect(() => {
    storage.saveEvidence(evidence);
  }, [evidence, storage]);

  useEffect(() => {
    void FileStore.migrateLegacyFiles(
      userId,
      evidence.map((item) => item.storageKey).filter((key): key is string => Boolean(key))
    );
  }, [userId]);

  const activeWorker = useMemo(() => {
    const realWorkers = workers.filter((w) => isRealPersonName(w.name));
    if (realWorkers.length === 0) {
      return workers[0];
    }
    if (!settings.activeWorkerId) {
      return realWorkers[0];
    }
    return realWorkers.find((w) => w.id === settings.activeWorkerId) || realWorkers[0];
  }, [workers, settings.activeWorkerId]);

  const conflicts = useMemo(() => {
    return detectScheduleConflicts(events, activeWorker, settings.dismissedConflicts);
  }, [events, activeWorker, settings.dismissedConflicts]);

  const availableShiftPeriods = useMemo<ShiftPeriod[]>(() => {
    const periodKeys = new Set<string>();

    workers.forEach((worker) => {
      Object.keys(worker.shifts || {}).forEach((date) => {
        const match = date.match(/^(\d{4})-(\d{2})-\d{2}$/);
        if (match) periodKeys.add(`${match[1]}-${match[2]}`);
      });
    });

    return Array.from(periodKeys)
      .sort()
      .map((period) => {
        const [year, month] = period.split('-').map(Number);
        return { year, month };
      });
  }, [workers]);

  const setLanguage = (lang: Language) => {
    setSettings((prev) => ({ ...prev, language: lang }));
  };

  const setTheme = (theme: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme }));
  };

  const setUserRole = (role: UserRole) => {
    setSettings((prev) => ({ ...prev, userRole: role }));
  };

  const setActiveWorkerId = (id: string | undefined) => {
    setSettings((prev) => ({ ...prev, activeWorkerId: id }));
  };

  const setActiveYearMonth = (year: number, month: number) => {
    setActiveYear(year);
    setActiveMonth(month);
    setSettings((prev) => ({
      ...prev,
      referenceYear: year,
      referenceMonth: month,
    }));
  };

  const setLastActiveView = (view: 'home' | 'shifts' | 'personal' | 'supervisor') => {
    setSettings((prev) => ({
      ...prev,
      activeView: view,
    }));
  };

  const markSplashSeen = () => {
    setSettings((prev) => ({
      ...prev,
      hasSeenSplash: true,
    }));
  };

  const loadImportedWorkerMonths = (imports: ImportedWorkerMonth[]) => {
    const validImports = imports
      .map((item) => ({
        ...item,
        workers: item.workers.filter((worker) => isRealPersonName(worker.name)),
      }))
      .filter((item) => item.workers.length > 0);
    if (validImports.length === 0) return;

    let mergedWorkers = workers;
    let selectedWorkerId: string | undefined;

    validImports.forEach((item, index) => {
      hydrateShiftDefinitionsFromWorkers(mergedWorkers);
      const syncedWorkers = syncWorkersShiftTimes(item.workers);
      const selectedImportedWorker =
        syncedWorkers.find((worker) => worker.id === item.selectedWorkerId) || syncedWorkers[0];

      if (index === 0) {
        selectedWorkerId = resolveImportedWorkerId(
          mergedWorkers,
          syncedWorkers,
          selectedImportedWorker?.id
        );
      }

      mergedWorkers = mergeImportedWorkersForPeriod(
        mergedWorkers,
        syncedWorkers,
        item.referenceYear,
        item.referenceMonth,
        index > 0
          ? {
              selectedImportedWorkerId: selectedImportedWorker?.id,
              targetWorkerId: selectedWorkerId,
            }
          : undefined
      );
    });

    const lastImport = validImports[validImports.length - 1];
    const chosenId = selectedWorkerId || mergedWorkers[0]?.id;
    const chosenWorker = mergedWorkers.find((worker) => worker.id === chosenId);
    const lastChosenWorkerDate = Object.keys(chosenWorker?.shifts || {}).sort().at(-1);
    const [targetYear, targetMonth] = lastChosenWorkerDate
      ? lastChosenWorkerDate.split('-').map(Number)
      : [lastImport.referenceYear, lastImport.referenceMonth];

    hydrateShiftDefinitionsFromWorkers(mergedWorkers);
    setWorkers(mergedWorkers);
    setActiveYear(targetYear);
    setActiveMonth(targetMonth);
    setSettings((prev) => ({
      ...prev,
      activeWorkerId: chosenId,
      referenceYear: targetYear,
      referenceMonth: targetMonth,
    }));
  };

  const loadImportedWorkers = (
    newWorkers: WorkerProfile[],
    selectedWorkerId?: string,
    referenceYear?: number,
    referenceMonth?: number
  ) => {
    const validNewWorkers = newWorkers.filter((worker) => isRealPersonName(worker.name));
    if (validNewWorkers.length === 0) return;

    loadImportedWorkerMonths([
      {
        workers: validNewWorkers,
        selectedWorkerId,
        referenceYear: referenceYear || validNewWorkers[0]?.referenceYear || activeYear,
        referenceMonth: referenceMonth || validNewWorkers[0]?.referenceMonth || activeMonth,
      },
    ]);
  };

  const updateDayShift = (workerId: string, dateStr: string, updatedShift: Partial<DayShift>) => {
    setWorkers((prevWorkers) =>
      prevWorkers.map((w) => {
        if (w.id !== workerId) return w;
        const currentShift = w.shifts[dateStr] || {
          date: dateStr,
          rawCode: 'L',
          category: 'off',
          isWorkDay: false,
        };
        const newShift: DayShift = {
          ...currentShift,
          ...updatedShift,
          editedManually: true,
        };
        return {
          ...w,
          shifts: {
            ...w.shifts,
            [dateStr]: newShift,
          },
        };
      })
    );
  };

  const updateShiftDefinition = (
    code: string,
    newStartTime: string,
    newEndTime: string,
    isWorkDay: boolean,
    name?: string
  ) => {
    const upperCode = code.toUpperCase().trim();
    if (COMMON_SHIFT_DEFINITIONS[upperCode]) {
      COMMON_SHIFT_DEFINITIONS[upperCode].defaultStartTime = newStartTime;
      COMMON_SHIFT_DEFINITIONS[upperCode].defaultEndTime = newEndTime;
      COMMON_SHIFT_DEFINITIONS[upperCode].isWorkDay = isWorkDay;
      if (name) COMMON_SHIFT_DEFINITIONS[upperCode].name = name;
    }

    // Replicate new start/end times across ALL workers' shifts that share this rawCode
    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) => {
        let changed = false;
        const updatedShifts = { ...worker.shifts };

        Object.entries(updatedShifts).forEach(([dateStr, shiftVal]) => {
          const shift = shiftVal as DayShift;
          if (shift && shift.rawCode && shift.rawCode.toUpperCase() === upperCode) {
            updatedShifts[dateStr] = {
              ...shift,
              startTime: isWorkDay ? newStartTime : '',
              endTime: isWorkDay ? newEndTime : '',
              isWorkDay: isWorkDay,
            };
            changed = true;
          }
        });

        if (!changed) return worker;

        return {
          ...worker,
          shifts: updatedShifts,
        };
      })
    );
  };

  const addPersonalEvent = (eventData: Omit<PersonalEvent, 'id'>) => {
    const newEvent: PersonalEvent = {
      ...eventData,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setEvents((prev) => [...prev, newEvent]);
  };

  const updatePersonalEvent = (updatedEvent: PersonalEvent) => {
    setEvents((prev) => prev.map((evt) => (evt.id === updatedEvent.id ? updatedEvent : evt)));
  };

  const deletePersonalEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((evt) => evt.id !== eventId));
  };

  const addEvidence = (item: HorarioEvidence) => {
    setEvidence((prev) => [item, ...prev]);
  };

  const deleteEvidence = (id: string) => {
    setEvidence((prev) => prev.filter((ev) => ev.id !== id));
  };

  const clearShiftsOnly = () => {
    storage.clearShiftsOnly();
    setWorkers([]);
    setSettings((prev) => ({ ...prev, activeWorkerId: undefined }));
  };

  const resetFullApp = () => {
    storage.resetFullApp();
    void FileStore.clearUserFiles(userId);
    setSettings({ ...defaultSettings });
    setWorkers([]);
    setEvents([]);
    setEvidence([]);
  };

  const exportBackup = () => {
    return storage.exportBackupData();
  };

  const importBackup = (jsonStr: string) => {
    const success = storage.importBackupData(jsonStr);
    if (success) {
      setSettings(storage.getSettings());
      setWorkers(storage.getWorkers());
      setEvents(storage.getEvents());
      setEvidence(storage.getEvidence());
    }
    return success;
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        workers,
        events,
        evidence,
        activeWorker,
        conflicts,
        activeYear,
        activeMonth,
        availableShiftPeriods,
        setLanguage,
        setTheme,
        setUserRole,
        setActiveWorkerId,
        setActiveYearMonth,
        setLastActiveView,
        markSplashSeen,
        loadImportedWorkers,
        loadImportedWorkerMonths,
        updateDayShift,
        updateShiftDefinition,
        addPersonalEvent,
        updatePersonalEvent,
        deletePersonalEvent,
        addEvidence,
        deleteEvidence,
        clearShiftsOnly,
        resetFullApp,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
