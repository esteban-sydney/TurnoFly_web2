import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Settings,
  Moon,
  Sun,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Database,
  Smartphone,
  Share2,
  PlusSquare,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { buttonMotion } from '../utils/motionVariants';
import { usePwaInstall } from '../hooks/usePwaInstall';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClearShifts: () => void;
  onConfirmResetApp: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfirmClearShifts,
  onConfirmResetApp,
}) => {
  const {
    settings,
    setLanguage,
    setTheme,
    exportBackup,
    importBackup,
  } = useApp();

  const lang = settings.language;
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [installStatus, setInstallStatus] = useState<string | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const { canInstall, install, isInstalled, isIos, isSecureContext } = usePwaInstall();

  if (!isOpen) return null;

  const handleExport = () => {
    const jsonStr = exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TurnoFly_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const success = importBackup(content);
          if (success) {
            setImportStatus('Backup restaurado correctamente.');
          } else {
            setImportStatus('Error: Formato de backup no válido.');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleInstall = async () => {
    const result = await install();

    if (result === 'accepted') {
      setInstallStatus('Instalación iniciada. TurnoFly aparecerá en tu pantalla de inicio.');
      setShowInstallHelp(false);
    } else if (result === 'dismissed') {
      setInstallStatus('Instalación cancelada. Puedes intentarlo nuevamente cuando quieras.');
    } else {
      setInstallStatus(null);
      setShowInstallHelp(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] glass-card">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {getTranslation(lang, 'settings')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preferencias de aplicación y gestión de datos local (Hive)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          
          {/* Theme Section */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              {getTranslation(lang, 'theme')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`p-3 rounded-2xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  settings.theme === 'light'
                    ? 'bg-sky-50 dark:bg-sky-950 border-sky-500 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>{getTranslation(lang, 'light')}</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-2xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-sky-50 dark:bg-sky-950 border-sky-500 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>{getTranslation(lang, 'dark')}</span>
              </button>
            </div>
          </div>

          {/* Language Section */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              {getTranslation(lang, 'language')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setLanguage('es')}
                className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer ${
                  settings.language === 'es'
                    ? 'bg-sky-50 dark:bg-sky-950 border-sky-500 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                🇪🇸 Español
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer ${
                  settings.language === 'en'
                    ? 'bg-sky-50 dark:bg-sky-950 border-sky-500 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                🇺🇸 English
              </button>
              <button
                onClick={() => setLanguage('pt')}
                className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer ${
                  settings.language === 'pt'
                    ? 'bg-sky-50 dark:bg-sky-950 border-sky-500 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                🇧🇷 Português
              </button>
            </div>
          </div>

          {/* Installable app section */}
          <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Instalar TurnoFly</h4>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Úsala desde tu pantalla de inicio y en modo pantalla completa.
                </p>
              </div>
            </div>

            {isInstalled ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 text-emerald-700 dark:text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>TurnoFly ya está instalada</span>
              </div>
            ) : (
              <motion.button
                type="button"
                onClick={handleInstall}
                className="w-full min-h-10 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                whileHover={buttonMotion.whileHover}
                whileTap={buttonMotion.whileTap}
                transition={buttonMotion.transition}
              >
                <Smartphone className="w-4 h-4" />
                <span>{canInstall ? 'Instalar ahora' : isIos ? 'Ver pasos para iPhone' : 'Cómo instalar'}</span>
              </motion.button>
            )}

            {installStatus && (
              <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300" role="status">
                {installStatus}
              </p>
            )}

            {showInstallHelp && isIos && (
              <div className="space-y-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-indigo-200 dark:border-indigo-800 p-3 text-[11px] text-slate-700 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-sky-600 shrink-0" />
                  En Safari, toca <strong>Compartir</strong>.
                </p>
                <p className="flex items-center gap-2">
                  <PlusSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  Elige <strong>Agregar a inicio</strong>.
                </p>
              </div>
            )}

            {showInstallHelp && !isIos && (
              <p className="rounded-xl bg-white/80 dark:bg-slate-900/60 border border-indigo-200 dark:border-indigo-800 p-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                {isSecureContext
                  ? 'En Chrome, abre el menú del navegador y selecciona “Instalar aplicación” o “Agregar a pantalla principal”.'
                  : 'La instalación automática requiere una dirección HTTPS. Estará disponible al publicar TurnoFly en un servidor seguro.'}
              </p>
            )}
          </div>

          {/* Backup / Restore Section */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-500" />
              <span>Respaldo y Restauración (Backup JSON)</span>
            </h4>

            {importStatus && (
              <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                {importStatus}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-sky-500" />
                <span>Exportar JSON</span>
              </button>

              <label className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                <span>Importar JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Reset Options */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                onConfirmClearShifts();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-600 hover:text-white text-amber-700 dark:text-amber-300 font-bold flex items-center justify-between cursor-pointer border border-amber-200 dark:border-amber-800 transition-colors"
            >
              <span>{getTranslation(lang, 'clearShiftsBtn')}</span>
              <Trash2 className="w-4 h-4" />
            </button>

            <motion.button
              onClick={() => {
                onConfirmResetApp();
                onClose();
              }}
              whileHover={buttonMotion.whileHover}
              whileTap={buttonMotion.whileTap}
              transition={buttonMotion.transition}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 font-bold flex items-center justify-between cursor-pointer border border-rose-200 dark:border-rose-800 transition-colors"
            >
              <span>{getTranslation(lang, 'resetAppBtn')}</span>
              <RotateCcw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
