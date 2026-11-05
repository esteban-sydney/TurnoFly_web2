import { configureWebPush, json } from '../../src/server/shiftPush';

export function GET(): Response {
  try {
    return json({ publicKey: configureWebPush().publicKey });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Push no está configurado.' }, 503);
  }
}
