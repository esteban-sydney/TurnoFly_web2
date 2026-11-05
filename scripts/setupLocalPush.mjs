import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import dotenv from 'dotenv';
import webPush from 'web-push';

const envPath = '.env.local';
const contents = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const current = dotenv.parse(contents);
const rotate = process.argv.includes('--rotate');

if (!rotate && current.TURNOFLY_VAPID_PUBLIC_KEY && current.TURNOFLY_VAPID_PRIVATE_KEY) {
  process.stdout.write('Las claves VAPID locales ya están configuradas.\n');
  process.exit(0);
}

const keys = webPush.generateVAPIDKeys();
const replacements = {
  TURNOFLY_VAPID_PUBLIC_KEY: keys.publicKey,
  TURNOFLY_VAPID_PRIVATE_KEY: keys.privateKey,
};

let updated = contents;
for (const [key, value] of Object.entries(replacements)) {
  const expression = new RegExp(`^${key}=.*$`, 'm');
  updated = expression.test(updated)
    ? updated.replace(expression, `${key}=${value}`)
    : `${updated}${updated.endsWith('\n') || updated.length === 0 ? '' : '\n'}${key}=${value}\n`;
}

writeFileSync(envPath, updated, 'utf8');
process.stdout.write(
  rotate
    ? 'Claves VAPID locales rotadas y guardadas en .env.local (no las compartas ni las publiques).\n'
    : 'Claves VAPID locales guardadas en .env.local (no las compartas ni las publiques).\n'
);
