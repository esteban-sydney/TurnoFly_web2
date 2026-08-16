import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  FileImage,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { sanitizeClonedDocForHtml2Canvas } from '../utils/html2canvasFix';

interface ShareImageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getShiftColorForCard = (code: string) => {
  if (code === 'L') {
    return 'bg-emerald-50 border-emerald-300 text-emerald-800';
  } else if (['M', 'MTV', 'D'].includes(code)) {
    return 'bg-sky-50 border-sky-300 text-sky-800';
  } else if (['T', 'TTV'].includes(code)) {
    return 'bg-amber-50 border-amber-300 text-amber-900';
  } else if (['N', 'NLV', 'ENL', 'ENV'].includes(code)) {
    return 'bg-violet-50 border-violet-300 text-violet-800';
  } else if (['A', 'AV', 'ALV', 'OLV'].includes(code)) {
    return 'bg-indigo-50 border-indigo-300 text-indigo-800';
  }

  return 'bg-slate-50 border-slate-300 text-slate-800';
};

const dataUrlToPngBlob = (dataUrl: string): Blob => {
  const encodedData = dataUrl.split(',')[1];
  const bytes = window.atob(encodedData);
  const buffer = new Uint8Array(bytes.length);

  for (let index = 0; index < bytes.length; index++) {
    buffer[index] = bytes.charCodeAt(index);
  }

  return new Blob([buffer], { type: 'image/png' });
};

export const ShareImageModal: React.FC<ShareImageModalProps> = ({ isOpen, onClose }) => {
  const { activeWorker, activeYear, activeMonth, settings } = useApp();
  const monthNames = getTranslation(settings.language, 'months');
  const cardRef = useRef<HTMLDivElement>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string | null>(null);
  const [isShareWarning, setIsShareWarning] = useState(false);

  const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
  const firstDayOfWeek = (new Date(activeYear, activeMonth - 1, 1).getDay() + 6) % 7; // 0 = Mon

  // Generate Image from DOM
  const generateCardImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    try {
      setIsGenerating(true);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc',
        logging: false,
        width: 900,
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          sanitizeClonedDocForHtml2Canvas(clonedDoc);
          const cardElem = clonedDoc.querySelector('[data-card-ref="true"]') as HTMLElement;
          if (cardElem) {
            cardElem.style.opacity = '1';
            cardElem.style.position = 'relative';
            cardElem.style.visibility = 'visible';
            cardElem.style.display = 'block';
          }
        },
      });

      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl && dataUrl.length > 500) {
        setPreviewImage(dataUrl);
        setIsGenerating(false);
        return dataUrl;
      }
      setIsGenerating(false);
      return null;
    } catch (err) {
      console.error('Error generating shift card image:', err);
      setIsGenerating(false);
      return null;
    }
  };

  useEffect(() => {
    if (isOpen && activeWorker) {
      setPreviewImage(null);
      setShareSuccessMsg(null);
      setIsShareWarning(false);
      // Delay slightly for font & DOM node rendering
      const timer = setTimeout(() => {
        generateCardImage();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeWorker, activeYear, activeMonth]);

  if (!isOpen) return null;

  const showShareMessage = (message: string, isWarning = false) => {
    setShareSuccessMsg(message);
    setIsShareWarning(isWarning);
    setTimeout(() => setShareSuccessMsg(null), isWarning ? 6000 : 3500);
  };

  const getImageFileName = () =>
    `TurnoFly_${activeWorker?.name.replace(/\s+/g, '_')}_${monthNames[activeMonth - 1]}_${activeYear}.png`;

  // Opens the native Android/iOS share sheet with the PNG already attached.
  const handleShareImage = async () => {
    if (!activeWorker || !previewImage) return;

    if (!window.isSecureContext) {
      showShareMessage(
        'Compartir directamente requiere abrir TurnoFly desde una dirección HTTPS segura.',
        true
      );
      return;
    }

    if (!navigator.share) {
      showShareMessage('Este navegador no ofrece el menú nativo para compartir archivos.', true);
      return;
    }

    const file = new File([dataUrlToPngBlob(previewImage)], getImageFileName(), {
      type: 'image/png',
    });
    const shareData: ShareData = {
      title: `TurnoFly - ${activeWorker.name}`,
      text: `Turnos de ${activeWorker.name} (${monthNames[activeMonth - 1]} ${activeYear})`,
      files: [file],
    };

    if (navigator.canShare && !navigator.canShare(shareData)) {
      showShareMessage('Tu navegador puede compartir, pero no permite adjuntar esta imagen PNG.', true);
      return;
    }

    try {
      await navigator.share(shareData);
      showShareMessage('Imagen compartida desde TurnoFly.');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Share error:', err);
      showShareMessage('No se pudo abrir el menú para compartir en este navegador.', true);
    }
  };

  // Copy PNG Image directly to Clipboard
  const handleCopyImageToClipboard = async () => {
    if (!activeWorker || !previewImage) return;
    try {
      if (window.isSecureContext && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const blob = dataUrlToPngBlob(previewImage);
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showShareMessage('Imagen copiada. Ya puedes pegarla en tu chat.');
      } else {
        showShareMessage('Copiar imágenes requiere abrir TurnoFly desde una dirección HTTPS.', true);
      }
    } catch (err) {
      console.error('Error copying image to clipboard:', err);
      showShareMessage('El navegador no permitió copiar la imagen.', true);
    }
  };

  // Download Image PNG
  const handleDownloadImage = () => {
    if (!previewImage || !activeWorker) return;

    const objectUrl = URL.createObjectURL(dataUrlToPngBlob(previewImage));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = getImageFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    showShareMessage('Solicitud de descarga enviada. Confirma “Descargar” en el navegador.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Calendario para compartir</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-wide">
                  Listo para Compartir
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Diseño simple con el día y el turno asignado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {shareSuccessMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-lg border ${
                isShareWarning
                  ? 'bg-amber-950/80 text-amber-200 border-amber-500/40'
                  : 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40'
              }`}
            >
              {isShareWarning ? (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{shareSuccessMsg}</span>
            </div>
          )}

          {!activeWorker ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
              <p className="font-bold">No hay un colaborador seleccionado o cargado.</p>
              <p className="text-xs">Carga una planilla o selecciona un trabajador para generar la tarjeta.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview Box */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-2 sm:p-4 text-center">
                {isGenerating && (
                  <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-indigo-400 text-xs font-bold">
                    <Sparkles className="w-6 h-6 animate-spin text-amber-400" />
                    <span>Diseñando tarjeta HD de turnos...</span>
                  </div>
                )}

                {previewImage ? (
                  <div className="space-y-2">
                    <img
                      src={previewImage}
                      alt="Calendario mensual con día y turno"
                      className="w-full max-h-[480px] object-contain rounded-xl shadow-2xl border border-slate-800/80"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      Vista previa en alta resolución para compartir
                    </p>
                  </div>
                ) : (
                  <div className="p-12 text-slate-400 text-xs font-semibold">
                    Generando vista previa...
                  </div>
                )}
              </div>

              {!window.isSecureContext && (
                <p className="rounded-xl border border-amber-800/70 bg-amber-950/40 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200">
                  La app está abierta por una dirección local HTTP. El menú directo de Android/iOS se habilita al usar TurnoFly mediante HTTPS.
                </p>
              )}

              {/* TARGET CANVAS FOR HTML2CANVAS HIGH-RES CARD RENDERING */}
              <div className="absolute top-0 left-0 -z-50 pointer-events-none opacity-0 overflow-hidden w-[900px]">
                <div
                  ref={cardRef}
                  data-card-ref="true"
                  className="w-[900px] bg-slate-50 text-slate-900 p-8 rounded-3xl border border-slate-200 shadow-2xl space-y-6 font-sans"
                >
                  <div className="flex items-center justify-between border-b-2 border-slate-200 pb-5">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-3xl text-white shadow-md shrink-0">
                        T
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-indigo-600 uppercase tracking-wider">TurnoFly</p>
                        <h2 className="text-2xl font-black text-slate-950 leading-tight">
                          {activeWorker.name}
                        </h2>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-5">
                      <div className="text-3xl font-black text-slate-950 uppercase">
                        {monthNames[activeMonth - 1]} {activeYear}
                      </div>
                      <p className="text-sm text-slate-500 font-bold mt-1">
                        Día y turno asignado
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-7 gap-3 text-center text-sm font-black text-slate-600 uppercase">
                      <span>Lu</span>
                      <span>Ma</span>
                      <span>Mi</span>
                      <span>Ju</span>
                      <span>Vi</span>
                      <span>Sá</span>
                      <span>Do</span>
                    </div>

                    <div className="grid grid-cols-7 gap-3">
                      {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="h-[112px] rounded-xl bg-slate-100 border border-slate-200" />
                      ))}

                      {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const dayNum = idx + 1;
                        const formattedMonth = activeMonth.toString().padStart(2, '0');
                        const formattedDay = dayNum.toString().padStart(2, '0');
                        const dateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;

                        const shift = activeWorker.shifts?.[dateStr];
                        const code = shift?.rawCode?.trim().toUpperCase() || '—';
                        const colorClasses = getShiftColorForCard(code);
                        const codeSize = code.length > 2 ? 'text-3xl' : 'text-5xl';

                        return (
                          <div
                            key={`card-day-${dayNum}`}
                            className={`h-[112px] rounded-xl p-3 flex flex-col border-2 ${colorClasses}`}
                          >
                            <span className="text-xl leading-none font-black text-slate-700">{dayNum}</span>
                            <div className="flex flex-1 items-center justify-center text-center">
                              <span className={`${codeSize} leading-none font-black uppercase`}>{code}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs text-slate-500 font-bold">
                    <span>TurnoFly</span>
                    <span>Día / turno</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleCopyImageToClipboard}
            disabled={isGenerating || !previewImage}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
            title="Copiar imagen de turnos directamente al portapapeles"
          >
            <Copy className="w-4 h-4 text-indigo-400" />
            <span>Copiar Imagen PNG</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={isGenerating || !previewImage}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Guardar Imagen PNG</span>
            </button>

            <button
              onClick={handleShareImage}
              disabled={isGenerating || !activeWorker || !previewImage}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>Compartir desde TurnoFly</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
