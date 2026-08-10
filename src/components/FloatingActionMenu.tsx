import React, { useState } from 'react';
import {
  Plus,
  X,
  Share2,
  FileSpreadsheet,
  Camera,
  Calendar,
  Settings,
  Sparkles,
} from 'lucide-react';

interface FloatingActionMenuProps {
  onOpenShareModal: () => void;
  onOpenImport: () => void;
  onOpenEvidence: () => void;
  onOpenSettings: () => void;
  setActiveView: (view: 'home' | 'shifts' | 'personal' | 'supervisor') => void;
  activeView: 'home' | 'shifts' | 'personal' | 'supervisor';
}

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
  onOpenShareModal,
  onOpenImport,
  onOpenEvidence,
  onOpenSettings,
  setActiveView,
  activeView,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  const handleAction = (actionFn: () => void) => {
    setIsOpen(false);
    actionFn();
  };

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
      {/* Expanded Speed Dial Action Buttons */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2.5 mb-2 pointer-events-auto animate-fade-in">
          {/* Action 1: Compartir Imagen de Turnos */}
          <div className="flex items-center gap-2.5 group">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black shadow-lg border border-slate-700 dark:border-slate-300 opacity-95 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              📸 Compartir Imagen de Turnos
            </span>
            <button
              onClick={() => handleAction(onOpenShareModal)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-indigo-400/40"
              title="Generar y compartir tarjeta de turnos en imagen"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Action 2: Importar Excel / Muestra */}
          <div className="flex items-center gap-2.5 group">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black shadow-lg border border-slate-700 dark:border-slate-300 opacity-95 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              📥 Importar Planilla Excel
            </span>
            <button
              onClick={() => handleAction(onOpenImport)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-xl shadow-amber-600/30 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-amber-400/40"
              title="Cargar archivo Excel con turnos"
            >
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Action 3: Evidencias y Comprobantes */}
          <div className="flex items-center gap-2.5 group">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black shadow-lg border border-slate-700 dark:border-slate-300 opacity-95 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              📷 Subir Evidencia / Foto
            </span>
            <button
              onClick={() => handleAction(onOpenEvidence)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-emerald-400/40"
              title="Guardar o cargar fotos de evidencias"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Action 4: Mis Turnos */}
          <div className="flex items-center gap-2.5 group">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black shadow-lg border border-slate-700 dark:border-slate-300 opacity-95 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              🗓️ Ver Matriz de Turnos
            </span>
            <button
              onClick={() => handleAction(() => setActiveView('shifts'))}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-xl shadow-purple-600/30 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-purple-400/40"
              title="Abrir vista completa de turnos"
            >
              <Calendar className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Action 5: Ajustes */}
          <div className="flex items-center gap-2.5 group">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black shadow-lg border border-slate-700 dark:border-slate-300 opacity-95 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ⚙️ Configuración
            </span>
            <button
              onClick={() => handleAction(onOpenSettings)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white shadow-xl shadow-slate-900/40 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer border border-slate-600/40"
              title="Configuración de la app"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Floating Trigger FAB */}
      <button
        onClick={toggleMenu}
        className={`w-14 h-14 rounded-3xl text-white shadow-2xl flex items-center justify-center transition-all transform active:scale-90 cursor-pointer pointer-events-auto relative border ${
          isOpen
            ? 'bg-slate-900 border-slate-700 rotate-45 scale-105'
            : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 border-indigo-400/50 hover:scale-110 shadow-indigo-600/40'
        }`}
        aria-label="Botón de Acciones Rápidas"
        title="Acciones Rápidas"
      >
        <span className="sr-only">Acciones Rápidas</span>
        {isOpen ? (
          <X className="w-6 h-6 text-white transition-transform duration-300" />
        ) : (
          <>
            <Plus className="w-7 h-7 text-white transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-slate-900 animate-pulse" />
          </>
        )}
      </button>
    </div>
  );
};
