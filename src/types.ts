export type Status = 'DRAFT' | 'PENDING_VALIDATION' | 'CORRECTION_REQUIRED' | 'HUMAN_REVIEW' | 'RESOLUTION_MANAGEMENT' | 'READY' | 'OPERATIONS';
export interface Session { accessToken: string; tokenType: 'Bearer'; expiresAt: string }
export interface Profile { id: string; name: string; customerReference: string; bankingProfile?: BankingProfile }
export interface Submission {
  id: string; caseReference: string; status: Status; revision: number;
  captureMethod?: 'PDF' | 'DIGITAL_EFORM';
  requestType?: string;
  createdAt: string; validatedAt: string | null; routedAt: string | null;
}
export interface Document { id: string; type: string; version: number; filename: string; captureMethod?: string }
export interface Correction {
  id: string; status: string; documentType: string; documentIds: string[]; ruleKey?: string; instruction: string;
}
export interface Detail { submission: Submission; documents: Document[]; corrections: Correction[]; requirements?: {name:string;passed:boolean}[]; processing?: {received:boolean;validated:boolean;revalidation:boolean;reviewRequired:boolean}; contactVerification?: { emailVerified: boolean; phoneVerified: boolean } | null }
export interface Notification {
  id: string; submissionId: string; type: string; message: string;
  channel: string; deliveryStatus: string; emailDeliveryStatus?: string | null; createdAt: string;
}

export interface BankingProfile {
  identityNumber: string; residentialAddress: string; mailingAddress: string; email: string;
  mobile: string; nationality: string; occupation: string; accountType: string; currency: string;
  taxResidency: string; riskRating: string; provenance: string;
}
export interface DigitalValues {
  requestType: string; accountType: string; currency: string; mailingAddress: string; email: string;
  mobile: string; occupation: string; taxResidency: string; foreignTaxCountry: string; taxIdentifier: string;
  declarationDate: string; taxDeclaration: boolean; authorisation: boolean; expectedRevision?: number; sourceOfFunds?: string;
}
