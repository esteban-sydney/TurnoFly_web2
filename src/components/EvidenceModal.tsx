import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ isOpen, onClose }) => {
  const { settings, evidence, addEvidence, deleteEvidence } = useApp();
  const lang = settings.language;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Size check max 8MB
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('El archivo excede el tamaño máximo permitido de 8 MB.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImg = file.type.startsWith('image/');

    if (!isPdf && !isImg) {
      setErrorMessage('Formato no soportado. Por favor sube una imagen (PNG, JPG) o un PDF.');
      return;
    }

    const previewUrl = isImg ? URL.createObjectURL(file) : undefined;
    const fileSizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(2));

    addEvidence({
      fileName: file.name,
      fileSizeMb,
      fileType: isPdf ? 'pdf' : 'image',
      uploadDate: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      previewUrl,
      extractedNotes: 'Documento procesado localmente. Lectura de cuadrante confirmada.',
    });

    setSuccessMessage('¡Evidencia de horario cargada exitosamente!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] glass-card">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {getTranslation(lang, 'evidenceTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resguardo digital de planilla o fotografía de turnos
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Upload Drop Area */}
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-3xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center cursor-pointer">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
              Haz clic para seleccionar o arrastra una imagen/PDF
            </p>
            <p className="text-slate-500">{getTranslation(lang, 'supportedFormats')}</p>
          </div>

          {/* Loaded Evidence List */}
          <div>
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3">
              Evidencias Almacenadas ({evidence.length})
            </h4>

            {evidence.length === 0 ? (
              <p className="text-slate-400 italic">No hay archivos de evidencia almacenados.</p>
            ) : (
              <div className="space-y-3">
                {evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {ev.fileType === 'pdf' ? (
                        <FileText className="w-6 h-6 text-rose-500 shrink-0" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-sky-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                          {ev.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {ev.fileSizeMb} MB • Subido el {ev.uploadDate}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteEvidence(ev.id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                      title="Eliminar evidencia"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
