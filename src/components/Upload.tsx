import {
  ChevronDown,
  ChevronUp,
  FileText,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useData } from "../data";
import { api, API_BASE, ApiError } from "../lib/api";
import {
  clearIntent,
  fingerprint,
  intentFiles,
  readIntent,
  sameFiles,
  saveIntent,
  useIntent,
} from "../lib/upload-intent";
import type { Detail } from "../types";
import { ErrorBox, Notice } from "./ui";

export const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
export { validateFiles } from '../lib/upload-format.mjs';
import { validateFiles } from '../lib/upload-format.mjs';

function FilePreview({ file }: { file: File }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const value = URL.createObjectURL(file);
    setUrl(value);
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      URL.revokeObjectURL(value);
      trigger.current?.focus();
    };
  }, [open, file]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="text-button"
        onClick={() => setOpen(true)}
        aria-label={`Preview ${file.name}`}
      >
        Preview
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="upload-dialog file-preview-dialog"
          aria-label={`Preview ${file.name}`}
          onCancel={() => setOpen(false)}
        >
          <div className="dialog-heading">
            <h2>{file.name}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Close preview"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <p className="form-body">
            Local preview only. This file has not been submitted yet.
          </p>
          {url && (
            <>
              {/\.(png|jpe?g)$/i.test(file.name) ? <img className="selected-image-preview" alt={`Selected document: ${file.name}`} src={url} /> : <iframe title={`Selected PDF: ${file.name}`} src={url} />}
              <a
                className="text-button"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                Open document in a new tab
              </a>
            </>
          )}
        </dialog>
      )}
    </>
  );
}

export function FilePicker({
  files,
  setFiles,
  max = 10,
  disabled = false,
  restoring = false,
}: {
  files: File[];
  setFiles: (files: File[]) => void;
  max?: number;
  disabled?: boolean;
  restoring?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const replaceIndex = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  async function select(incoming: File[]) {
    if (disabled || checking || !incoming.length) return;
    setChecking(true);
    setError("");
    const next = restoring || max === 1 ? incoming : [...files, ...incoming];
    try {
      const message = await validateFiles(next, max);
      if (message) setError(message);
      else setFiles(next);
    } catch {
      setError("One of these files could not be read. Choose it again.");
    } finally {
      setChecking(false);
    }
  }
  async function replace(file?: File) {
    if (!file || disabled || checking) return;
    setChecking(true);
    setError("");
    try {
      const next = files.map((current, index) =>
        index === replaceIndex.current ? file : current,
      );
      const problem = await validateFiles(next, max);
      if (problem) setError(problem);
      else setFiles(next);
    } catch {
      setError("The replacement document could not be read. Choose it again.");
    } finally {
      setChecking(false);
    }
  }
  return (
    <div className="file-picker">
      <input ref={cameraInput} type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" aria-label="Take a document photo" disabled={disabled || checking} onChange={event => { void select(Array.from(event.target.files || [])); event.target.value = ''; }} />
      <input
        ref={replaceInput}
        type="file"
        className="sr-only"
        aria-label="Choose replacement document"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        disabled={disabled || checking}
        onChange={(event) => {
          void replace(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={input}
        type="file"
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        multiple={max > 1}
        disabled={disabled || checking}
        aria-label={max === 1 ? "Choose corrected document" : "Choose documents or images"}
        onChange={(e) => {
          void select(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <div
        className={`dropzone ${dragging ? "dragging" : ""} ${disabled ? "disabled" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void select(Array.from(e.dataTransfer.files));
        }}
      >
        <span className="upload-symbol">
          <UploadCloud size={27} />
        </span>
        <h3>
          {restoring
            ? "Reselect your original files"
            : "Upload a PDF, screenshot or clear photo of your document."}
        </h3>
        <p>
          {restoring
            ? "Choose the exact same files, in the same order, to confirm the earlier request."
            : `Or choose ${max === 1 ? "a file" : "files"} from your device.`}
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={disabled || checking}
          onClick={() => input.current?.click()}
        >
          {checking ? "Checking files…" : "Browse files"}
        </button>
        <button type="button" className="button secondary" disabled={disabled || checking} onClick={() => cameraInput.current?.click()}>Take a photo</button>
        <p>Keep all edges visible, avoid glare and check that every field is readable. Upload all pages in order.</p>
        <small>
          PDF, JPG, JPEG, PNG · Up to 10 MB each{max > 1 ? ` · Maximum ${max} files` : ""}
        </small>
      </div>
      {error && <ErrorBox message={error} />}
      {!!files.length && (
        <ul className="file-list" aria-label="Selected documents">
          {files.map((file, i) => (
            <li key={`${i}-${file.name}`}>
              <span className="file-icon">
                <FileText size={21} />
              </span>
              <div>
                <strong>{file.name}</strong>
                <small>Ready to upload · {size(file.size)}</small>
              </div>
              <div className="selected-file-actions">
                <FilePreview file={file} />
                <button
                  type="button"
                  className="text-button"
                  disabled={disabled || checking}
                  aria-label={`Replace ${file.name}`}
                  onClick={() => {
                    replaceIndex.current = i;
                    replaceInput.current?.click();
                  }}
                >
                  Replace
                </button>
              </div>
              {files.length > 1 && (
                <span className="file-order">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move ${file.name} up`}
                    disabled={disabled || i === 0}
                    onClick={() => {
                      const next = [...files];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      setFiles(next);
                    }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move ${file.name} down`}
                    disabled={disabled || i === files.length - 1}
                    onClick={() => {
                      const next = [...files];
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      setFiles(next);
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                </span>
              )}
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => setFiles(files.filter((_, n) => n !== i))}
              >
                <X size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function useUpload(path: string, returnTo: string, initialCombineImages = false) {
  const { profile } = useAuth();
  const id = profile!.id;
  const pending = useIntent(id);
  const { submissions, notifications } = useData();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [combineImages, setCombineImages] = useState(pending?.combineImages ?? initialCombineImages);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const samePath = pending?.path === path;
  const initialFiles = () => intentFiles(samePath ? pending : null);
  async function submit(files: File[]): Promise<Detail | null> {
    if (submitting.current) return null;
    submitting.current = true;
    setBusy(true);
    setProgress(0);
    setError("");
    let intent = readIntent(id);
    try {
      if (intent && intent.path !== path)
        throw new Error(
          "Confirm your earlier upload before starting another request.",
        );
      const message = await validateFiles(
        files,
        path.endsWith("/replacement") && !combineImages ? 1 : 10,
      );
      if (message) throw new Error(message);
      if (combineImages && (files.some(file => !/\.(png|jpe?g)$/i.test(file.name)) || files.reduce((n, file) => n + file.size, 0) > 12 * 1024 * 1024)) throw new Error('Pages of one form must all be JPG or PNG images, at most 12 MB combined.');
      const hashes = await fingerprint(files);
      if (intent && !sameFiles(intent.files, hashes))
        throw new Error(
          "These files do not match the original request. Reselect the same files in the same order.",
        );
      intent ??= {
        key: crypto.randomUUID(),
        customerId: id,
        apiBase: API_BASE,
        path,
        returnTo,
        createdAt: new Date().toISOString(),
        files: hashes,
      };
      saveIntent(intent, files);
      const body = new FormData();
      for (const file of files) body.append("files", file, file.name);
      // Grouping is part of the retry intent and must remain unchanged after sending.
      if (intent.combineImages !== undefined && intent.combineImages !== combineImages) throw new Error('Restore the original page grouping before retrying.');
      intent.combineImages = combineImages;
      saveIntent(intent, files);
      body.append('combineImages', String(combineImages));
      const result = await api<Detail>(path, {
        method: "POST",
        headers: { "Idempotency-Key": intent.key },
        body,
        timeout: 600000,
        onUploadProgress: setProgress,
      });
      if (
        !result.submission?.id ||
        !Array.isArray(result.documents) ||
        !Array.isArray(result.corrections)
      )
        throw new ApiError(
          502,
          "The response could not be confirmed. Retry the original request safely.",
          "",
          true,
        );
      clearIntent(id);
      void submissions.refresh();
      void notifications.refresh();
      return result;
    } catch (e) {
      if (
        e instanceof ApiError &&
        !e.uncertain &&
        e.status >= 400 &&
        e.status < 500 &&
        e.status !== 401 &&
        e.code !== "IDEMPOTENCY_CONFLICT"
      )
        clearIntent(id);
      setError(
        e instanceof Error
          ? e.message
          : "The upload could not be confirmed. Retry the same request.",
      );
      return null;
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  useEffect(() => { if (pending?.combineImages !== undefined) setCombineImages(pending.combineImages); }, [pending]);
  return { submit, busy, progress, combineImages, setCombineImages, error, pending, samePath, initialFiles };
}

export function UploadFeedback({
  uploader,
}: {
  uploader: ReturnType<typeof useUpload>;
}) {
  return (
    <>
      {!uploader.busy && <ImagePageOption checked={uploader.combineImages} disabled={!!uploader.pending} onChange={uploader.setCombineImages} />}
      {uploader.busy && (
        <div className="processing-notice" role="status">
          <LoaderCircle className="spin" size={22} />
          <div>
            <strong>{uploader.progress < 100 ? `Uploading documents: ${uploader.progress}%` : 'Upload complete. Checking your documents...'}</strong>
            <progress aria-label="Document upload progress" value={uploader.progress} max={100} />
            <p>
              This can take several minutes. Keep this tab open. We’ll confirm
              the result when the service responds.
            </p>
          </div>
        </div>
      )}
      {uploader.error && <ErrorBox message={uploader.error} />}
      {uploader.pending && !uploader.busy && (
        <Notice>
          <p>
            <strong>An earlier upload needs confirmation.</strong> Retry with
            the original files to reuse the same request safely. You can also{" "}
            <Link to="/submissions">check your submissions</Link>. A timeout
            does not mean the upload failed.
          </p>
        </Notice>
      )}
    </>
  );
}

export function ImagePageOption({ checked, disabled = false, onChange }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <label className="checkbox-label"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span>These images are ordered pages of one form (JPG/PNG only, 12 MB combined). Leave unchecked for separate documents.</span></label>;
}
