import type { DigitalValues } from "../types";
export interface RequestDraft {
  values: DigitalValues;
  files: File[];
  addressReady: boolean;
  retry: boolean;
  intent: { key: string; body: string; multipart: boolean } | null;
}
const drafts = new Map<string, RequestDraft>();
export const readDraft = (key: string) => drafts.get(key);
export const saveDraft = (key: string, draft: RequestDraft) =>
  drafts.set(key, draft);
export const clearDraft = (key: string) => drafts.delete(key);
export interface PdfDraft {
  requestType: string;
  files: File[];
  step: number;
  acknowledged: boolean;
}
const pdfDrafts = new Map<string, PdfDraft>();
export const readPdfDraft = (key: string) => pdfDrafts.get(key);
export const savePdfDraft = (key: string, draft: PdfDraft) =>
  pdfDrafts.set(key, draft);
export const clearPdfDraft = (key: string) => pdfDrafts.delete(key);
export const clearRequestDrafts = () => {
  drafts.clear();
  pdfDrafts.clear();
};
