export type Status = 'DRAFT' | 'PENDING_VALIDATION' | 'CORRECTION_REQUIRED' | 'HUMAN_REVIEW' | 'READY' | 'OPERATIONS';
export interface Session { accessToken: string; tokenType: 'Bearer'; expiresAt: string }
export interface Profile { id: string; name: string; customerReference: string }
export interface Submission {
  id: string; caseReference: string; status: Status; revision: number;
  createdAt: string; validatedAt: string | null; routedAt: string | null;
}
export interface Document { id: string; type: string; version: number; filename: string }
export interface Correction {
  id: string; status: string; documentType: string; documentIds: string[]; instruction: string;
}
export interface Detail { submission: Submission; documents: Document[]; corrections: Correction[] }
export interface Notification {
  id: string; submissionId: string; type: string; message: string;
  channel: string; deliveryStatus: string; createdAt: string;
}
