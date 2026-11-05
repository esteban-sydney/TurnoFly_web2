# Configurar recordatorios push en producción

Los recordatorios programados se guardan en Supabase. Supabase Cron llama cada minuto a una función de Vercel, que entrega las notificaciones por Web Push. La clave privada VAPID y la clave de servicio de Supabase solo viven en el servidor.

Para reemplazar un par VAPID ya configurado (por ejemplo, si se expuso accidentalmente), ejecuta `npm run setup:push-local -- --rotate`. El script nunca imprime las claves. Luego actualiza ambas variables VAPID en Vercel y vuelve a desplegar; al activar las notificaciones, TurnoFly renovará automáticamente una suscripción que use la clave pública anterior.

## 1. Aplicar la migración

En el panel del proyecto Supabase, abre **SQL Editor**, pega y ejecuta el contenido de `supabase/migrations/20261105_create_shift_push.sql`. La migración crea tablas privadas y funciones RPC usadas únicamente por el backend.

## 2. Crear el secreto de Cron

Genera un valor aleatorio en PowerShell y guárdalo para usarlo tanto en Vercel como en Supabase Vault:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

No lo pongas en el código ni lo envíes por correo o chat.

## 3. Configurar variables en Vercel

En **Project → Settings → Environment Variables**, configura para **Production**:

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key de Supabase |
| `SUPABASE_SECRET_KEY` | Secret key de Supabase; solo servidor. La clave antigua service_role también se acepta. |
| `TURNOFLY_VAPID_PUBLIC_KEY` | Clave pública del par VAPID local ya generado |
| `TURNOFLY_VAPID_PRIVATE_KEY` | Clave privada VAPID correspondiente; solo servidor |
| `TURNOFLY_VAPID_SUBJECT` | `mailto:tu-correo-de-contacto` |
| `CRON_SECRET` | El valor aleatorio generado en el paso anterior |

Vuelve a desplegar después de guardar estas variables. No uses el prefijo `VITE_` para ninguna clave privada.

## 4. Permitir enlaces de acceso de producción

En **Supabase → Authentication → URL Configuration**, confirma que la URL de producción de TurnoFly esté en **Redirect URLs**. Conserva también las URLs locales que ya utilizas.

## 5. Programar Supabase Cron

En SQL Editor ejecuta el siguiente bloque, reemplazando la URL por el dominio HTTPS de producción y `REEMPLAZA_POR_CRON_SECRET` por el mismo valor de Vercel. No guardes el bloque con el secreto en Git.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

select cron.unschedule(jobid)
from cron.job
where jobname = 'turnofly-push-dispatch';

select vault.create_secret(
  'https://turnofly.vercel.app',
  'turnofly_push_dispatch_url'
);
select vault.create_secret(
  'REEMPLAZA_POR_CRON_SECRET',
  'turnofly_push_cron_secret'
);

select cron.schedule(
  'turnofly-push-dispatch',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'turnofly_push_dispatch_url')
             || '/api/shift-push/dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'turnofly_push_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

If the production domain is different, change `https://turnofly.vercel.app` before running the SQL. Vault secrets are encrypted in Supabase and are not part of the migration.

## 6. Probar

Abre el sitio HTTPS en el dispositivo, inicia sesión, permite notificaciones y activa **Ajustes → Recordatorios de turno**. Pulsa **Probar notificación**. Después, revisa en Supabase **Cron → Jobs** y **Cron → Job Runs** si quieres comprobar las ejecuciones del programador.

La aplicación debe abrirse al menos una vez en cada dispositivo y usuario para registrar la suscripción push. Si cambias horarios o el profesional activo, vuelve a sincronizar al abrir la app. Los cambios que se hagan en otro dispositivo se reflejan en este cuando vuelva a abrir TurnoFly.

En iOS, instala TurnoFly en la pantalla de inicio y permite notificaciones para recibir push web.
