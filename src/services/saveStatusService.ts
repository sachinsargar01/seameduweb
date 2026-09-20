import { useState, useEffect } from 'react';

export type SaveStatusState = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveStatusInfo {
  status: SaveStatusState;
  message: string;
  timestamp?: number;
}

type Listener = (info: SaveStatusInfo) => void;

class SaveStatusServiceImpl {
  private current: SaveStatusInfo = { status: 'idle', message: '' };
  private listeners: Set<Listener> = new Set();
  private clearTimer: any = null;

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): SaveStatusInfo {
    return this.current;
  }

  public setSaving(message: string = 'Saving to Google Sheet...'): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.current = { status: 'saving', message, timestamp: Date.now() };
    this.notify();
  }

  public setSaved(message: string = 'Saved ✓'): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.current = { status: 'saved', message, timestamp: Date.now() };
    this.notify();

    // Auto-revert to idle after 2.8 seconds
    this.clearTimer = setTimeout(() => {
      this.current = { status: 'idle', message: '' };
      this.notify();
    }, 2800);
  }

  public setError(message: string = 'Failed to sync to Google Sheet'): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.current = { status: 'error', message, timestamp: Date.now() };
    this.notify();

    // Auto-revert to idle after 6 seconds
    this.clearTimer = setTimeout(() => {
      this.current = { status: 'idle', message: '' };
      this.notify();
    }, 6000);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.current));
  }
}

export const SaveStatusService = new SaveStatusServiceImpl();

export function useSaveStatus(): SaveStatusInfo {
  const [info, setInfo] = useState<SaveStatusInfo>(SaveStatusService.getStatus());

  useEffect(() => {
    return SaveStatusService.subscribe(setInfo);
  }, []);

  return info;
}
