import { useEffect, useState } from 'react';
import { API_BASE } from './api';
import { validIntent } from './recovery.mjs';
export { sameFiles } from './recovery.mjs';

export interface FileFingerprint { name: string; size: number; sha256: string }
export interface UploadIntent {
  key: string; customerId: string; apiBase: string; path: string; returnTo: string;
  createdAt: string; files: FileFingerprint[];
}
const filesInMemory = new Map<string, File[]>();
const intentsInMemory = new Map<string, UploadIntent>();
const changed = () => window.dispatchEvent(new Event('afi-upload-intent'));
const storageKey = (id: string) => `afi-upload:${API_BASE}:${id}`;

export function readIntent(customerId: string): UploadIntent | null {
  try {
    const raw = sessionStorage.getItem(storageKey(customerId));
    if (raw && raw.length < 20000) {
      const value = JSON.parse(raw) as UploadIntent;
      if (validIntent(value, customerId, API_BASE)) return value;
    }
  } catch { /* Storage can be disabled; retain the current tab's in-memory intent. */ }
  return intentsInMemory.get(storageKey(customerId)) || null;
}

export function saveIntent(intent: UploadIntent, files: File[]) {
  intentsInMemory.set(storageKey(intent.customerId), intent);
  filesInMemory.set(intent.key, files);
  try { sessionStorage.setItem(storageKey(intent.customerId), JSON.stringify(intent)); } catch { /* In-memory retries still work. */ }
  changed();
}
export function clearIntent(id: string) {
  const intent = readIntent(id);
  if (intent) filesInMemory.delete(intent.key);
  intentsInMemory.delete(storageKey(id));
  try { sessionStorage.removeItem(storageKey(id)); } catch { /* Storage may be disabled. */ }
  changed();
}
export function clearUploadMemory() { filesInMemory.clear(); intentsInMemory.clear(); }
export function intentFiles(intent: UploadIntent | null) { return intent ? filesInMemory.get(intent.key) || [] : []; }
export function useIntent(id: string) {
  const [intent, setIntent] = useState(() => readIntent(id));
  useEffect(() => {
    const update = () => setIntent(readIntent(id));
    update(); window.addEventListener('afi-upload-intent', update);
    return () => window.removeEventListener('afi-upload-intent', update);
  }, [id]);
  return intent;
}
export async function fingerprint(files: File[]): Promise<FileFingerprint[]> {
  return Promise.all(files.map(async file => ({ name: file.name, size: file.size,
    sha256: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join(''),
  })));
}
