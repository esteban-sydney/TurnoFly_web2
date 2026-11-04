import React, { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarDays, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { buttonMotion } from '../utils/motionVariants';
import { clearPendingAuthEmail, getPendingAuthEmail, savePendingAuthEmail } from '../utils/pendingAuth';

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
  const pendingEmail = getPendingAuthEmail();
  const [email, setEmail] = useState(pendingEmail || '');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(Boolean(pendingEmail));
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
      const normalizedEmail = email.trim().toLowerCase();
      await sendCode(normalizedEmail);
      savePendingAuthEmail(normalizedEmail);
      setEmail(normalizedEmail);
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
      clearPendingAuthEmail();
    } catch (verifyError) {
      setError(getMessage(verifyError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const editEmail = () => {
    clearPendingAuthEmail();
    setCodeSent(false);
    setCode('');
    setError('');
  };

  return (
    <main className="auth-screen app-backdrop min-h-screen text-slate-900 dark:text-slate-100 flex items-center justify-center px-4 py-8 overflow-hidden relative">
      <motion.div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-400"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      <motion.section
        className="auth-card glass-card w-full max-w-md rounded-[1.75rem] overflow-hidden"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="px-6 pt-7 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-300/50 dark:shadow-indigo-950/50"
            >
              <CalendarDays className="w-6 h-6" />
            </motion.div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Acceso seguro</p>
              <h1 className="text-2xl font-black text-slate-950 dark:text-white">Turno<span className="text-indigo-600 dark:text-indigo-400">Fly</span></h1>
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
                  <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">Inicia sesión</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Recibirás un código de acceso en tu correo.</p>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Correo electrónico</span>
                  <span className="relative block">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                      placeholder="nombre@correo.com"
                      className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-950"
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
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Revisa tu correo</h2>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 break-all">Enviamos el código a {email}.</p>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Código de acceso</span>
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
                    className="w-full h-14 rounded-xl border border-slate-300 bg-slate-50 px-4 text-center text-2xl font-black text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-800 dark:focus:ring-indigo-950"
                  />
                </label>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <button
                    type="button"
                    onClick={editEmail}
                    className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-indigo-700 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Cambiar correo
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestCode()}
                    disabled={secondsUntilResend > 0 || isSubmitting}
                    className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {secondsUntilResend > 0 ? `Reenviar en ${secondsUntilResend}s` : 'Reenviar código'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isConfigured && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Falta configurar la conexión pública de Supabase.
            </p>
          )}

          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={isSubmitting || !isConfigured || (codeSent && code.length < 6)}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-300/50 transition hover:from-indigo-500 hover:to-violet-500 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer dark:shadow-indigo-950/50 dark:disabled:from-slate-700 dark:disabled:to-slate-700"
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
