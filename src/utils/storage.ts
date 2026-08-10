import { AppSettings, WorkerProfile, PersonalEvent, HorarioEvidence } from '../types';

const SETTINGS_KEY = 'turnofly_settings_v1';
const WORKERS_KEY = 'turnofly_workers_v1';
const EVENTS_KEY = 'turnofly_events_v1';
const EVIDENCE_KEY = 'turnofly_evidence_v1';

export const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'es',
  userRole: 'worker',
  activeWorkerId: undefined,
  remindersEnabled: true,
  defaultRemoteMode: true,
  dismissedConflicts: [],
};

export const StorageService = {
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings to storage:', e);
    }
  },

  getWorkers(): WorkerProfile[] {
    try {
      const data = localStorage.getItem(WORKERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveWorkers(workers: WorkerProfile[]): void {
    try {
      localStorage.setItem(WORKERS_KEY, JSON.stringify(workers));
    } catch (e) {
      console.error('Error saving workers to storage:', e);
    }
  },

  getEvents(): PersonalEvent[] {
    try {
      const data = localStorage.getItem(EVENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveEvents(events: PersonalEvent[]): void {
    try {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    } catch (e) {
      console.error('Error saving events to storage:', e);
    }
  },

  getEvidence(): HorarioEvidence[] {
    try {
      const data = localStorage.getItem(EVIDENCE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveEvidence(evidence: HorarioEvidence[]): void {
    try {
      localStorage.setItem(EVIDENCE_KEY, JSON.stringify(evidence));
    } catch (e) {
      console.error('Error saving evidence to storage:', e);
    }
  },

  clearShiftsOnly(): void {
    try {
      localStorage.removeItem(WORKERS_KEY);
      const settings = this.getSettings();
      settings.activeWorkerId = undefined;
      this.saveSettings(settings);
    } catch (e) {
      console.error('Error clearing shifts:', e);
    }
  },

  resetFullApp(): void {
    try {
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(WORKERS_KEY);
      localStorage.removeItem(EVENTS_KEY);
      localStorage.removeItem(EVIDENCE_KEY);
    } catch (e) {
      console.error('Error resetting app:', e);
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
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) this.saveSettings(data.settings);
      if (Array.isArray(data.workers)) this.saveWorkers(data.workers);
      if (Array.isArray(data.events)) this.saveEvents(data.events);
      if (Array.isArray(data.evidence)) this.saveEvidence(data.evidence);
      return true;
    } catch (e) {
      console.error('Invalid backup JSON:', e);
      return false;
    }
  }
};
