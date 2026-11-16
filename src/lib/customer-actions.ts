import type { Correction, Detail } from '../types';
export function customerActions(detail: Detail): Correction[] {
  const supportMissing = !detail.documents.some(d => d.type === 'SUPPORTING_DOCUMENT');
  const hasAttachment = detail.corrections.some(r => r.ruleKey === 'ATTACH_SUPPORTING_DOCUMENT');
  const address = ['ADDRESS_CHANGE','RESIDENTIAL_ADDRESS_CHANGE'].includes(detail.submission.requestType || '');
  const kind = detail.submission.requestType === 'RESIDENTIAL_ADDRESS_CHANGE' ? 'residential' : 'mailing';
  return detail.corrections.filter(r => !(supportMissing && hasAttachment && r.ruleKey === 'SERVICE_SUPPORT')).map(r => ({...r,
    instruction: address && supportMissing && ['ATTACH_SUPPORTING_DOCUMENT','SERVICE_SUPPORT'].includes(r.ruleKey || '')
      ? `Upload one PDF showing your new ${kind} address and customer reference.`
      : address && r.ruleKey === 'SERVICE_SUPPORT' ? `Upload a replacement PDF matching your requested ${kind} address and customer reference.`
      : address && r.ruleKey === 'SERVICE_DETAILS' ? `Enter a different ${kind} address.`
      : /[A-Z]{3,}_[A-Z_]+/.test(r.instruction) ? 'Update the requested information or document so we can continue.' : r.instruction
  }));
}
export function requestNextStep(status: string, actions: number): string {
  if (status === 'OPERATIONS') return 'Your request has been sent for processing. No action is needed from you.';
  if (status === 'REJECTED') return 'Your request was not approved. Check the updates below for the decision.';
  if (actions) return 'Please complete the action below. We will check your update automatically.';
  if (status === 'PENDING_VALIDATION') return 'We are checking your documents. You can return here for updates.';
  return 'Your request is under review. We will let you know if we need anything else.';
}
