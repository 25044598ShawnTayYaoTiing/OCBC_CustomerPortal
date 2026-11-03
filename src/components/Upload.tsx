import { ChevronDown, ChevronUp, FileText, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { useData } from '../data';
import { api, API_BASE, ApiError } from '../lib/api';
import { clearIntent, fingerprint, intentFiles, readIntent, sameFiles, saveIntent, useIntent } from '../lib/upload-intent';
import type { Detail } from '../types';
import { ErrorBox, Notice } from './ui';

export const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
export async function validateFiles(files: File[], max = 10) {
  if (!files.length || files.length > max) return `Choose ${max === 1 ? 'one PDF' : `1 to ${max} PDFs`}.`;
  if (files.reduce((n, file) => n + file.size, 0) > 100 * 1024 * 1024) return 'Keep the combined file size under 100 MB.';
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.pdf') || file.name.length > 200 || file.size === 0 || file.size > 10 * 1024 * 1024)
      return `${file.name}: choose a nonempty PDF, up to 10 MB, with a filename under 200 characters.`;
    if (await file.slice(0, 5).text() !== '%PDF-') return `${file.name} is not a valid PDF file.`;
  }
  if (new Set(files.map(f => `${f.name}:${f.size}:${f.lastModified}`)).size !== files.length) return 'The same file is selected more than once. Remove the duplicate.';
  return '';
}

export function FilePicker({ files, setFiles, max = 10, disabled = false, restoring = false }: {
  files: File[]; setFiles: (files: File[]) => void; max?: number; disabled?: boolean; restoring?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  async function select(incoming: File[]) {
    if (disabled || checking || !incoming.length) return;
    setChecking(true); setError('');
    const next = restoring || max === 1 ? incoming : [...files, ...incoming];
    try { const message = await validateFiles(next, max); if (message) setError(message); else setFiles(next); }
    catch { setError('One of these files could not be read. Choose it again.'); }
    finally { setChecking(false); }
  }
  return <div className="file-picker">
    <input ref={input} type="file" className="sr-only" accept=".pdf,application/pdf" multiple={max > 1} disabled={disabled || checking}
      aria-label={max === 1 ? 'Choose corrected PDF' : 'Choose PDF documents'} onChange={e => { void select(Array.from(e.target.files || [])); e.target.value = ''; }} />
    <div className={`dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); void select(Array.from(e.dataTransfer.files)); }}>
      <span className="upload-symbol"><UploadCloud size={27} /></span>
      <h3>{restoring ? 'Reselect your original files' : 'Drag and drop your PDFs here'}</h3>
      <p>{restoring ? 'Choose the exact same PDFs, in the same order, to confirm the earlier request.' : `Or choose ${max === 1 ? 'a file' : 'files'} from your device.`}</p>
      <button type="button" className="button secondary" disabled={disabled || checking} onClick={() => input.current?.click()}>{checking ? 'Checking files…' : 'Browse files'}</button>
      <small>PDF only · Up to 10 MB each{max > 1 ? ` · Maximum ${max} files` : ''}</small>
    </div>
    {error && <ErrorBox message={error} />}
    {!!files.length && <ul className="file-list" aria-label="Selected documents">{files.map((file, i) => <li key={`${i}-${file.name}`}><span className="file-icon"><FileText size={21} /></span><div><strong>{file.name}</strong><small>PDF document · {size(file.size)}</small></div>{files.length > 1 && <span className="file-order"><button type="button" className="icon-button" aria-label={`Move ${file.name} up`} disabled={disabled || i === 0} onClick={() => { const next = [...files]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setFiles(next); }}><ChevronUp size={14} /></button><button type="button" className="icon-button" aria-label={`Move ${file.name} down`} disabled={disabled || i === files.length - 1} onClick={() => { const next = [...files]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; setFiles(next); }}><ChevronDown size={14} /></button></span>}<button type="button" className="icon-button" aria-label={`Remove ${file.name}`} disabled={disabled} onClick={() => setFiles(files.filter((_, n) => n !== i))}><X size={17} /></button></li>)}</ul>}
  </div>;
}

export function useUpload(path: string, returnTo: string) {
  const { profile } = useAuth();
  const id = profile!.id;
  const pending = useIntent(id);
  const { submissions, notifications } = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const samePath = pending?.path === path;
  const initialFiles = () => intentFiles(samePath ? pending : null);
  async function submit(files: File[]): Promise<Detail | null> {
    if (submitting.current) return null;
    submitting.current = true; setBusy(true); setError('');
    let intent = readIntent(id);
    try {
      if (intent && intent.path !== path) throw new Error('Confirm your earlier upload before starting another request.');
      const message = await validateFiles(files, path.endsWith('/replacement') ? 1 : 10);
      if (message) throw new Error(message);
      const hashes = await fingerprint(files);
      if (intent && !sameFiles(intent.files, hashes)) throw new Error('These files do not match the original request. Reselect the same PDFs in the same order.');
      intent ??= { key: crypto.randomUUID(), customerId: id, apiBase: API_BASE, path, returnTo, createdAt: new Date().toISOString(), files: hashes };
      saveIntent(intent, files);
      const body = new FormData(); for (const file of files) body.append('files', file, file.name);
      const result = await api<Detail>(path, { method: 'POST', headers: { 'Idempotency-Key': intent.key }, body, timeout: 600000 });
      if (!result.submission?.id || !Array.isArray(result.documents) || !Array.isArray(result.corrections))
        throw new ApiError(502, 'The response could not be confirmed. Retry the original request safely.', '', true);
      clearIntent(id);
      void submissions.refresh(); void notifications.refresh();
      return result;
    } catch (e) {
      if (e instanceof ApiError && !e.uncertain && e.status >= 400 && e.status < 500 && e.status !== 401 && e.code !== 'IDEMPOTENCY_CONFLICT') clearIntent(id);
      setError(e instanceof Error ? e.message : 'The upload could not be confirmed. Retry the same request.');
      return null;
    } finally { submitting.current = false; setBusy(false); }
  }
  return { submit, busy, error, pending, samePath, initialFiles };
}

export function UploadFeedback({ uploader }: { uploader: ReturnType<typeof useUpload> }) {
  return <>
    {uploader.busy && <div className="processing-notice" role="status"><LoaderCircle className="spin" size={22} /><div><strong>Submitting and checking your documents</strong><p>This can take several minutes. Keep this tab open. We’ll confirm the result when the service responds.</p></div></div>}
    {uploader.error && <ErrorBox message={uploader.error} />}
    {uploader.pending && !uploader.busy && <Notice><p><strong>An earlier upload needs confirmation.</strong> Retry with the original files to reuse the same request safely. You can also <Link to="/submissions">check your submissions</Link>. A timeout does not mean the upload failed.</p></Notice>}
  </>;
}
