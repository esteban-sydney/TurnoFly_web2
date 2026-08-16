import React, { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarDays, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { buttonMotion } from '../utils/motionVariants';

const getMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('rate limit')) {
    return 'Espera un momento antes de solicitar otro código.';
  }
  if (message.includes('expired') || message.includes('invalid')) {
    return 'El código no es válido o ya venció. Solicita uno nuevo.';
  }

  return 'No pudimos completar el acceso. Revisa los datos e intenta nuevamente.';
};

export const AuthScreen: React.FC = () => {
  const { isConfigured, sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsUntilResend((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsUntilResend]);

  const requestCode = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      await sendCode(email.trim().toLowerCase());
      setCodeSent(true);
      setSecondsUntilResend(60);
    } catch (requestError) {
      setError(getMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!codeSent) {
      await requestCode();
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await verifyCode(email.trim().toLowerCase(), code.trim());
    } catch (verifyError) {
      setError(getMessage(verifyError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const editEmail = () => {
    setCodeSent(false);
    setCode('');
    setError('');
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4 py-8 overflow-hidden relative">
      <motion.div
        className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#4f46e5_0_25%,#fbbf24_25%_45%,#0f172a_45%_65%,#10b981_65%_82%,#0ea5e9_82%)]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      <motion.section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 overflow-hidden"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="px-6 pt-7 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CalendarDays className="w-6 h-6" />
            </motion.div>
            <div>
              <p className="text-[11px] font-extrabold uppercase text-indigo-600">Acceso seguro</p>
              <h1 className="text-2xl font-black">Turno<span className="text-indigo-600">Fly</span></h1>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <AnimatePresence mode="wait">
            {!codeSent ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-extrabold">Inicia sesión</h2>
                  <p className="mt-1 text-sm text-slate-500">Recibirás un código de acceso en tu correo.</p>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-bold text-slate-700">Correo electrónico</span>
                  <span className="relative block">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                      placeholder="nombre@correo.com"
                      className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </span>
                </label>
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                className="space-y-5"
              >
                <div>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                    <h2 className="text-xl font-extrabold text-slate-900">Revisa tu correo</h2>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 break-all">Enviamos el código a {email}.</p>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-bold text-slate-700">Código de acceso</span>
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6,10}"
                    maxLength={10}
                    autoFocus
                    placeholder="000000"
                    className="w-full h-14 rounded-xl border border-slate-300 bg-slate-50 px-4 text-center text-2xl font-black outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </label>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <button
                    type="button"
                    onClick={editEmail}
                    className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Cambiar correo
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestCode()}
                    disabled={secondsUntilResend > 0 || isSubmitting}
                    className="font-bold text-indigo-600 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {secondsUntilResend > 0 ? `Reenviar en ${secondsUntilResend}s` : 'Reenviar código'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isConfigured && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              Falta configurar la conexión pública de Supabase.
            </p>
          )}

          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={isSubmitting || !isConfigured || (codeSent && code.length < 6)}
            className="w-full h-12 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
            whileHover={!isSubmitting ? buttonMotion.whileHover : undefined}
            whileTap={!isSubmitting ? buttonMotion.whileTap : undefined}
            transition={buttonMotion.transition}
          >
            {isSubmitting ? (
              <LoaderCircle className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {codeSent ? 'Entrar a TurnoFly' : 'Enviar código'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>
      </motion.section>
    </main>
  );
};
