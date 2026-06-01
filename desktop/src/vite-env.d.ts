/// <reference types="vite/client" />

import type { TrackTimeApi } from '../electron/preload';

declare global {
  interface Window {
    tracktime: TrackTimeApi;
  }
}

export {};
