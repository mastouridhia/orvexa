import './env.js';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { RealtimeBus, setBus, type OrvexaIo } from '../../src/realtime/bus.js';

let cached: Express | null = null;
let busInstalled = false;

function installNoopBus(): void {
  if (busInstalled) return;
  const fakeIo = {
    to: () => ({ emit: (): void => undefined }),
  } as unknown as OrvexaIo;
  setBus(new RealtimeBus(fakeIo));
  busInstalled = true;
}

export function app(): Express {
  installNoopBus();
  if (!cached) cached = createApp();
  return cached;
}
