import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  Calendar,
  Building,
  Laptop,
  Clock,
  Briefcase,
  AlertCircle,
  FileImage,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { COMMON_SHIFT_DEFINITIONS } from '../utils/excelParser';
import { sanitizeClonedDocForHtml2Canvas } from '../utils/html2canvasFix';

interface ShareImageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to extract shift details and high-contrast color styles for share image card
const getShiftDetailsForCard = (code: string, shift?: any) => {
  const def = COMMON_SHIFT_DEFINITIONS[code];
  const name = def?.name || (code === 'L' ? 'Día Libre' : `Turno ${code}`);
  const startTime = shift?.startTime || def?.defaultStartTime || '';
  const endTime = shift?.endTime || def?.defaultEndTime || '';
  const isWork = shift?.isWorkDay ?? (def ? def.isWorkDay : code !== 'L');

  let hoursLabel = '';
  if (startTime && endTime) {
    hoursLabel = `${startTime} - ${endTime}`;
  } else if (isWork) {
    hoursLabel = 'Jornada Laboral';
  } else {
    hoursLabel = 'Descanso / Libre';
  }

  // Vivid, solid high-contrast styles for generated PNG image
  let cellBg = 'bg-slate-800 border-slate-700/80';
  let badgeBg = 'bg-slate-600 text-white font-black';
  let textColor = 'text-slate-200';

  if (!isWork || code === 'L') {
    cellBg = 'bg-emerald-950/80 border-emerald-600/70';
    badgeBg = 'bg-emerald-500 text-slate-950 font-black';
    textColor = 'text-emerald-300';
  } else if (['M', 'MTV', 'D'].includes(code)) {
    cellBg = 'bg-sky-950/80 border-sky-600/70';
    badgeBg = 'bg-sky-500 text-slate-950 font-black';
    textColor = 'text-sky-300';
  } else if (['T', 'TTV'].includes(code)) {
    cellBg = 'bg-amber-950/80 border-amber-600/70';
    badgeBg = 'bg-amber-500 text-slate-950 font-black';
    textColor = 'text-amber-300';
  } else if (['N', 'NLV', 'ENL', 'ENV'].includes(code)) {
    cellBg = 'bg-purple-950/80 border-purple-600/70';
    badgeBg = 'bg-purple-500 text-white font-black';
    textColor = 'text-purple-300';
  } else {
    // Admin A, AV, ALV, OLV, X
    cellBg = 'bg-indigo-950/80 border-indigo-600/70';
    badgeBg = 'bg-indigo-500 text-white font-black';
    textColor = 'text-indigo-300';
  }

  return { name, startTime, endTime, hoursLabel, isWork, cellBg, badgeBg, textColor };
};

export const ShareImageModal: React.FC<ShareImageModalProps> = ({ isOpen, onClose }) => {
  const { activeWorker, activeYear, activeMonth, settings } = useApp();
  const monthNames = getTranslation(settings.language, 'months');
  const cardRef = useRef<HTMLDivElement>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string | null>(null);

  const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
  const firstDayOfWeek = (new Date(activeYear, activeMonth - 1, 1).getDay() + 6) % 7; // 0 = Mon

  // Unique shift definitions used in this worker's month for the legend
  const uniqueShiftsInMonth = React.useMemo(() => {
    if (!activeWorker || !activeWorker.shifts) return [];
    const map = new Map<string, { code: string; name: string; hoursLabel: string; isWork: boolean; badgeBg: string }>();

    const formattedMonth = activeMonth.toString().padStart(2, '0');
    for (let d = 1; d <= daysInMonth; d++) {
      const formattedDay = d.toString().padStart(2, '0');
      const dateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;
      const shift = activeWorker.shifts[dateStr];
      const code = shift?.rawCode || 'L';

      if (!map.has(code)) {
        const info = getShiftDetailsForCard(code, shift);
        map.set(code, {
          code,
          name: info.name,
          hoursLabel: info.hoursLabel,
          isWork: info.isWork,
          badgeBg: info.badgeBg,
        });
      }
    }

    return Array.from(map.values());
  }, [activeWorker, activeYear, activeMonth, daysInMonth]);

  // Stats calculation
  const stats = React.useMemo(() => {
    if (!activeWorker || !activeWorker.shifts) {
      return { totalHours: 0, remoteDays: 0, officeDays: 0, offDays: 0, workDays: 0 };
    }
    let totalHours = 0;
    let remoteDays = 0;
    let officeDays = 0;
    let offDays = 0;
    let workDays = 0;

    const formattedMonth = activeMonth.toString().padStart(2, '0');

    for (let d = 1; d <= daysInMonth; d++) {
      const formattedDay = d.toString().padStart(2, '0');
      const dateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;
      const shift = activeWorker.shifts[dateStr];

      if (shift && shift.isWorkDay) {
        workDays++;
        totalHours += 8;
        if (shift.isRemote) remoteDays++;
        else officeDays++;
      } else {
        offDays++;
      }
    }

    return { totalHours, remoteDays, officeDays, offDays, workDays };
  }, [activeWorker, activeYear, activeMonth, daysInMonth]);

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
        backgroundColor: '#0f172a',
        logging: false,
        width: 860,
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
      // Delay slightly for font & DOM node rendering
      const timer = setTimeout(() => {
        generateCardImage();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeWorker, activeYear, activeMonth]);

  if (!isOpen) return null;

  // Native Web Share Image with automatic download fallback
  const handleShareImage = async () => {
    if (!activeWorker) return;
    try {
      let dataUrl = previewImage;
      if (!dataUrl) {
        dataUrl = await generateCardImage();
      }

      if (!dataUrl) {
        setShareSuccessMsg('⚠️ No se pudo generar la imagen. Intenta descargándola directamente.');
        return;
      }

      const fileName = `TurnoFly_${activeWorker.name.replace(/\s+/g, '_')}_${monthNames[activeMonth - 1]}_${activeYear}.png`;

      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: 'image/png' });

        // Try Web Share API if supported
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `TurnoFly - ${activeWorker.name}`,
            text: `Planilla de turnos de ${activeWorker.name} (${monthNames[activeMonth - 1]} ${activeYear})`,
            files: [file],
          });
          setShareSuccessMsg('¡Imagen PNG de turnos compartida!');
          setTimeout(() => setShareSuccessMsg(null), 3500);
          return;
        }
      } catch (shareErr) {
        console.log('Web share API not permitted or cancelled, falling back to download', shareErr);
      }

      // Fallback: Direct download PNG file for WhatsApp/sharing
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShareSuccessMsg('¡Imagen PNG descargada a tu celular/PC para enviar por WhatsApp!');
      setTimeout(() => setShareSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        handleDownloadImage();
      }
    }
  };

  // Copy PNG Image directly to Clipboard
  const handleCopyImageToClipboard = async () => {
    if (!activeWorker) return;
    try {
      let dataUrl = previewImage;
      if (!dataUrl) {
        dataUrl = await generateCardImage();
      }
      if (!dataUrl) return;

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setShareSuccessMsg('¡Imagen de turnos copiada al portapapeles! Pégala en tu chat.');
        setTimeout(() => setShareSuccessMsg(null), 3500);
      } else {
        // Fallback to download
        handleDownloadImage();
      }
    } catch (err) {
      console.error('Error copying image to clipboard:', err);
      // Download fallback
      handleDownloadImage();
    }
  };

  // Download Image PNG
  const handleDownloadImage = async () => {
    let dataUrl = previewImage;
    if (!dataUrl) {
      dataUrl = await generateCardImage();
    }
    if (!dataUrl || !activeWorker) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `TurnoFly_${activeWorker.name.replace(/\s+/g, '_')}_${monthNames[activeMonth - 1]}_${activeYear}.png`;
    link.click();
    setShareSuccessMsg('¡Imagen PNG descargada con éxito!');
    setTimeout(() => setShareSuccessMsg(null), 3500);
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
                <span>Tarjeta Visual de Turnos</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-wide">
                  Listo para Compartir
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Generado automáticamente para WhatsApp, Redes o Galería
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
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-lg">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
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
                      alt="Planilla de turnos card"
                      className="w-full max-h-[380px] object-contain rounded-xl shadow-2xl border border-slate-800/80"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      📸 Vista previa de alta resolución para enviar por celular
                    </p>
                  </div>
                ) : (
                  <div className="p-12 text-slate-400 text-xs font-semibold">
                    Generando vista previa...
                  </div>
                )}
              </div>

              {/* TARGET CANVAS FOR HTML2CANVAS HIGH-RES CARD RENDERING */}
              <div className="absolute top-0 left-0 -z-50 pointer-events-none opacity-0 overflow-hidden w-[860px]">
                <div
                  ref={cardRef}
                  data-card-ref="true"
                  className="w-[860px] bg-slate-900 text-white p-7 rounded-3xl border border-indigo-500/40 shadow-2xl space-y-6 font-sans"
                >
                  {/* Card Header Branding */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-indigo-500/30">
                        TF
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                          <span>TurnoFly</span>
                          <span className="text-xs bg-amber-400/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wide">
                            Planilla Oficial
                          </span>
                        </h2>
                        <p className="text-sm text-slate-200 font-bold mt-0.5">
                          {activeWorker.name} • {activeWorker.role || 'Operativo / Colaborador'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-amber-400 uppercase tracking-wide">
                        {monthNames[activeMonth - 1]} {activeYear}
                      </div>
                      <p className="text-xs text-slate-300 font-semibold mt-0.5">
                        Calendario de Turnos Rotativos
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-center">
                      <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider block mb-1">
                        Trabajo
                      </span>
                      <span className="text-2xl font-black text-white">{stats.workDays}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">días</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-indigo-950/90 border border-indigo-700 text-center">
                      <span className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider block mb-1">
                        Teletrabajo
                      </span>
                      <span className="text-2xl font-black text-indigo-200">{stats.remoteDays}</span>
                      <span className="text-[10px] text-indigo-400 uppercase tracking-wider">días</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-950/90 border border-amber-700 text-center">
                      <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider block mb-1">
                        Oficina
                      </span>
                      <span className="text-2xl font-black text-amber-200">{stats.officeDays}</span>
                      <span className="text-[10px] text-amber-300 uppercase tracking-wider">días</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-700 text-center">
                      <span className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider block mb-1">
                        Libres
                      </span>
                      <span className="text-2xl font-black text-emerald-200">{stats.offDays}</span>
                      <span className="text-[10px] text-emerald-300 uppercase tracking-wider">días</span>
                    </div>
                  </div>

                  {/* Monthly Shift Grid View */}
                  <div className="space-y-2.5">
                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-black text-slate-300 uppercase tracking-wider bg-slate-950/80 py-2 rounded-xl border border-slate-800">
                      <span>Lunes</span>
                      <span>Martes</span>
                      <span>Miércoles</span>
                      <span>Jueves</span>
                      <span>Viernes</span>
                      <span>Sábado</span>
                      <span>Domingo</span>
                    </div>

                    <div className="grid grid-cols-7 gap-2.5 text-xs">
                      {/* Empty pad slots */}
                      {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="h-[92px] rounded-2xl bg-slate-800/20 border border-slate-800/40" />
                      ))}

                      {/* Day cells */}
                      {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const dayNum = idx + 1;
                        const formattedMonth = activeMonth.toString().padStart(2, '0');
                        const formattedDay = dayNum.toString().padStart(2, '0');
                        const dateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;

                        const shift = activeWorker.shifts?.[dateStr];
                        const code = shift?.rawCode || 'L';
                        const isRemote = shift?.isRemote ?? false;
                        const info = getShiftDetailsForCard(code, shift);

                        return (
                          <div
                            key={`card-day-${dayNum}`}
                            className={`h-[92px] rounded-2xl p-2 flex flex-col justify-between border shadow-sm ${info.cellBg}`}
                          >
                            {/* Day Header: Day number + Location tag */}
                            <div className="flex items-center justify-between w-full leading-none">
                              <span className="font-black text-sm text-white">{dayNum}</span>
                              {info.isWork ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-950/90 text-slate-100 border border-slate-700">
                                  {isRemote ? '🏠 Casa' : '🏢 Ofic'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-700/50">🌴 Libre</span>
                              )}
                            </div>

                            {/* CENTER: HIGH CONTRAST SHIFT CODE BADGE */}
                            <div className="text-center my-auto flex items-center justify-center">
                              <span className={`px-2.5 py-1 rounded-lg text-xs tracking-wider font-black shadow-sm ${info.badgeBg}`}>
                                {code}
                              </span>
                            </div>

                            {/* BOTTOM: TIME / SHORT NAME LABEL */}
                            <div className="text-[11px] font-black text-center tracking-tight text-slate-100 leading-normal">
                              {info.hoursLabel !== 'Descanso / Libre' ? info.hoursLabel : 'Libre'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SHIFT LEGEND / LEYENDA Y HORARIOS DE TURNOS */}
                  <div className="p-4 rounded-2xl bg-slate-950/95 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-black text-amber-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Leyenda y Horarios de Turnos</span>
                      </div>
                      <span className="text-xs text-slate-300 font-bold normal-case">
                        Códigos de este mes
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {uniqueShiftsInMonth.map((item) => (
                        <div
                          key={`legend-${item.code}`}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-sm"
                        >
                          <span className={`px-3 py-1.5 rounded-xl font-black text-xs tracking-wider shrink-0 shadow-sm ${item.badgeBg}`}>
                            {item.code}
                          </span>
                          <div className="min-w-0 flex-1 leading-normal">
                            <div className="font-black text-white text-xs leading-snug">{item.name}</div>
                            <div className="text-xs font-black text-amber-300 leading-snug">{item.hoursLabel}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer Branding */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 font-bold">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Generado por <b className="text-white">TurnoFly</b></span>
                    </div>
                    <span>Planilla Personalizada • Guardado Offline</span>
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
              disabled={isGenerating || !activeWorker}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>Compartir Imagen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
