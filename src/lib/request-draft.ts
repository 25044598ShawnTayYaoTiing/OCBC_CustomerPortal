import { useEffect, useState } from "react";
import { api, API_BASE } from "./api";
import { fingerprint, type FileFingerprint } from "./upload-intent";
import {
  validEformDraftMeta,
  validEformIntent,
  validPdfDraftMeta,
} from "./recovery.mjs";
import type { DigitalValues } from "../types";

export interface RequestDraft {
  combineImages?: boolean;
  stage?: number;
  values: DigitalValues;
  files: File[];
  addressReady: boolean;
  retry: boolean;
  intent: { key: string; body: string; multipart: boolean } | null;
}

export interface EformDraftMeta {
  stage?: number;
  requestType?: string;
  accountType?: string;
  currency?: string;
  taxResidency?: string;
  taxDeclaration?: boolean;
  addressReady?: boolean;
  combineImages?: boolean;
}

export interface EformIntent {
  key: string;
  customerId: string;
  apiBase: string;
  path: string;
  returnTo: string;
  requestType: string;
  submissionId?: string;
  multipart: boolean;
  combineImages?: boolean;
  createdAt: string;
  bodySha256: string;
  files?: FileFingerprint[];
}

export interface RequestStatusResponse {
  found: boolean;
  inProgress?: boolean;
  submissionId?: string;
  status?: string;
  revision?: number;
  operation?: string;
  hasDocuments?: boolean;
  pendingVerification?: boolean;
}

const drafts = new Map<string, RequestDraft>();
const pdfDrafts = new Map<string, PdfDraft>();
const eformIntentsInMemory = new Map<string, EformIntent>();

const EFORM_INTENT_PREFIX = `afi-eform-intent:${API_BASE}:`;
const EFORM_DRAFT_PREFIX = `afi-eform-draft:${API_BASE}:`;
const PDF_DRAFT_PREFIX = `afi-pdf-draft:${API_BASE}:`;

const eformIntentKey = (customerId: string) => `${EFORM_INTENT_PREFIX}${customerId}`;
const eformDraftStorageKey = (key: string) => `${EFORM_DRAFT_PREFIX}${key}`;
const pdfDraftStorageKey = (key: string) => `${PDF_DRAFT_PREFIX}${key}`;
const emitEformIntentChanged = () => window.dispatchEvent(new Event("afi-eform-intent"));

function storageGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage may be disabled; in-memory state remains active for this tab. */
  }
}

function storageRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Storage may be disabled. */
  }
}

function storageRemoveByPrefix(prefixes: string[]) {
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && prefixes.some((p) => k.startsWith(p))) toDelete.push(k);
    }
    toDelete.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* Storage may be disabled. */
  }
}

export const readDraft = (key: string) => drafts.get(key);

export function readPersistedDraftMeta(key: string): EformDraftMeta | null {
  const raw = storageGet(eformDraftStorageKey(key));
  if (!raw || raw.length >= 10000) return null;
  try {
    const parsed = JSON.parse(raw);
    return validEformDraftMeta(parsed) ? (parsed as EformDraftMeta) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: RequestDraft) {
  drafts.set(key, draft);
  const meta: EformDraftMeta = {
    ...(draft.stage !== undefined ? { stage: draft.stage } : {}),
    ...(draft.values.requestType ? { requestType: draft.values.requestType } : {}),
    ...(draft.values.accountType ? { accountType: draft.values.accountType } : {}),
    ...(draft.values.currency ? { currency: draft.values.currency } : {}),
    ...(draft.values.taxResidency ? { taxResidency: draft.values.taxResidency } : {}),
    taxDeclaration: !!draft.values.taxDeclaration,
    addressReady: !!draft.addressReady,
    combineImages: !!draft.combineImages,
  };
  if (validEformDraftMeta(meta)) {
    storageSet(eformDraftStorageKey(key), meta);
  }
}

export function clearDraft(key: string) {
  drafts.delete(key);
  storageRemove(eformDraftStorageKey(key));
}

export interface PdfDraft {
  combineImages?: boolean;
  requestType: string;
  files: File[];
  step: number;
  acknowledged: boolean;
}

export function readPdfDraft(key: string): PdfDraft | undefined {
  const inMemory = pdfDrafts.get(key);
  if (inMemory) return inMemory;
  const raw = storageGet(pdfDraftStorageKey(key));
  if (!raw || raw.length >= 10000) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!validPdfDraftMeta(parsed)) return undefined;
    return {
      requestType: parsed.requestType || "ADDRESS_CHANGE",
      step: typeof parsed.step === "number" ? parsed.step : 0,
      acknowledged: !!parsed.acknowledged,
      combineImages: !!parsed.combineImages,
      files: [],
    };
  } catch {
    return undefined;
  }
}

export function savePdfDraft(key: string, draft: PdfDraft) {
  pdfDrafts.set(key, draft);
  const meta = {
    requestType: draft.requestType,
    step: draft.step,
    acknowledged: !!draft.acknowledged,
    combineImages: !!draft.combineImages,
  };
  if (validPdfDraftMeta(meta)) {
    storageSet(pdfDraftStorageKey(key), meta);
  }
}

export function clearPdfDraft(key: string) {
  pdfDrafts.delete(key);
  storageRemove(pdfDraftStorageKey(key));
}

export function readEformIntent(customerId: string): EformIntent | null {
  const raw = storageGet(eformIntentKey(customerId));
  if (raw && raw.length < 20000) {
    try {
      const value = JSON.parse(raw) as EformIntent;
      if (validEformIntent(value, customerId, API_BASE)) return value;
    } catch {
      /* Ignore corrupt storage payload and fall back to memory if available. */
    }
  }
  return eformIntentsInMemory.get(eformIntentKey(customerId)) || null;
}

export function saveEformIntent(intent: EformIntent) {
  if (!validEformIntent(intent, intent.customerId, API_BASE)) return;
  eformIntentsInMemory.set(eformIntentKey(intent.customerId), intent);
  storageSet(eformIntentKey(intent.customerId), intent);
  emitEformIntentChanged();
}

export function clearEformIntent(customerId: string) {
  eformIntentsInMemory.delete(eformIntentKey(customerId));
  storageRemove(eformIntentKey(customerId));
  emitEformIntentChanged();
}

export function useEformIntent(customerId: string) {
  const [eformIntent, setEformIntent] = useState(() => readEformIntent(customerId));
  useEffect(() => {
    const update = () => setEformIntent(readEformIntent(customerId));
    update();
    window.addEventListener("afi-eform-intent", update);
    return () => window.removeEventListener("afi-eform-intent", update);
  }, [customerId]);
  return eformIntent;
}

export async function sha256Text(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildEformIntentRecord(params: {
  key: string;
  customerId: string;
  path: string;
  returnTo: string;
  requestType: string;
  submissionId?: string;
  multipart: boolean;
  combineImages?: boolean;
  body: string;
  files: File[];
}): Promise<EformIntent> {
  const [bodySha256, fileFingerprints] = await Promise.all([
    sha256Text(params.body),
    params.files.length ? fingerprint(params.files) : Promise.resolve(undefined),
  ]);
  return {
    key: params.key,
    customerId: params.customerId,
    apiBase: API_BASE,
    path: params.path,
    returnTo: params.returnTo,
    requestType: params.requestType,
    ...(params.submissionId ? { submissionId: params.submissionId } : {}),
    multipart: params.multipart,
    ...(params.multipart ? { combineImages: !!params.combineImages } : {}),
    createdAt: new Date().toISOString(),
    bodySha256,
    ...(fileFingerprints ? { files: fileFingerprints } : {}),
  };
}

export const checkRequestStatus = (key: string) =>
  api<RequestStatusResponse>(`/requests/${encodeURIComponent(key)}/status`);

export const clearRequestDrafts = () => {
  drafts.clear();
  pdfDrafts.clear();
  eformIntentsInMemory.clear();
  storageRemoveByPrefix([EFORM_INTENT_PREFIX, EFORM_DRAFT_PREFIX, PDF_DRAFT_PREFIX]);
  emitEformIntentChanged();
};
