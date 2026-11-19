/** Compare actual file bytes and order, not only filenames, before replaying a request.
 * @param {{name:string,size:number,sha256:string}[]} original
 * @param {{name:string,size:number,sha256:string}[]} selected
 */
export function sameFiles(original, selected) {
  return original.length === selected.length && original.every((f, i) =>
    f.name === selected[i].name && f.size === selected[i].size && f.sha256 === selected[i].sha256);
}

/** Reject untrusted retry metadata for other identities, API origins or routes.
 * @param {any} value
 * @param {string} customerId
 * @param {string} apiBase
 */
export function validIntent(value, customerId, apiBase) {
  return !!value && value.customerId === customerId && value.apiBase === apiBase
    && typeof value.key === 'string' && /^[\w-]{8,100}$/.test(value.key)
    && (value.combineImages === undefined || typeof value.combineImages === 'boolean')
    && typeof value.path === 'string' && /^\/submissions(?:\/[\w-]+\/documents(?:\/[\w-]+\/replacement)?)?(?:\?requestType=(?:ADDRESS_CHANGE|RESIDENTIAL_ADDRESS_CHANGE|ADDITIONAL_ACCOUNT|CONTACT_UPDATE|TAX_RESIDENCY_UPDATE))?$/.test(value.path)
    && typeof value.returnTo === 'string' && /^\/(?:submit|submissions\/[\w-]+)$/.test(value.returnTo)
    && Array.isArray(value.files) && value.files.length > 0 && value.files.length <= 10
    && validFileList(value.files);
}

const REQUEST_TYPES = new Set([
  'ADDRESS_CHANGE',
  'RESIDENTIAL_ADDRESS_CHANGE',
  'ADDITIONAL_ACCOUNT',
  'CONTACT_UPDATE',
  'TAX_RESIDENCY_UPDATE',
]);

/** @param {any[]} files */
function validFileList(files) {
  return files.every((/** @type {any} */ f) => f && typeof f.name === 'string' && f.name.length <= 200
    && typeof f.size === 'number' && f.size > 0 && f.size <= 10 * 1024 * 1024
    && typeof f.sha256 === 'string' && /^[a-f0-9]{64}$/.test(f.sha256));
}

/** Reject untrusted digital-form retry metadata for other identities, API origins or routes.
 * Stores no sensitive customer PII (only fingerprints, service key, route and safe flags).
 * @param {any} value
 * @param {string} customerId
 * @param {string} apiBase
 */
export function validEformIntent(value, customerId, apiBase) {
  if (!value || value.customerId !== customerId || value.apiBase !== apiBase) return false;
  if (typeof value.key !== 'string' || !/^[\w-]{8,100}$/.test(value.key)) return false;
  if (typeof value.multipart !== 'boolean') return false;
  if (value.combineImages !== undefined && typeof value.combineImages !== 'boolean') return false;
  if (value.submissionId !== undefined && value.submissionId !== ''
    && (typeof value.submissionId !== 'string' || !/^[\w-]{1,64}$/.test(value.submissionId))) return false;
  if (value.incompleteSubmissionId !== undefined && value.incompleteSubmissionId !== ''
    && (typeof value.incompleteSubmissionId !== 'string' || !/^[\w-]{1,64}$/.test(value.incompleteSubmissionId))) return false;
  if (!REQUEST_TYPES.has(value.requestType)) return false;
  if (typeof value.path !== 'string'
    || !/^\/(?:eforms(?:\/with-documents)?|submissions\/[\w-]+\/eform(?:\/with-documents)?)$/.test(value.path)) return false;
  if (typeof value.returnTo !== 'string'
    || !/^\/(?:submit\/digital(?:\?[^#\s]*)?|submissions\/[\w-]+\/form)$/.test(value.returnTo)) return false;
  if (typeof value.bodySha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.bodySha256)) return false;
  if (value.files !== undefined) {
    if (!Array.isArray(value.files) || value.files.length > 10 || !validFileList(value.files)) return false;
  }
  return true;
}

const SAFE_EFORM_DRAFT_KEYS = new Set([
  'stage', 'requestType', 'accountType', 'currency',
  'taxResidency', 'taxDeclaration', 'addressReady', 'combineImages',
]);

/** Keep only non-sensitive digital-form draft metadata suitable for sessionStorage.
 * @param {any} value
 */
export function validEformDraftMeta(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.some((k) => !SAFE_EFORM_DRAFT_KEYS.has(k))) return false;
  if (value.requestType !== undefined && value.requestType !== '' && !REQUEST_TYPES.has(value.requestType)) return false;
  if (value.stage !== undefined && ![0, 1, 2, 3].includes(value.stage)) return false;
  if (value.addressReady !== undefined && typeof value.addressReady !== 'boolean') return false;
  if (value.combineImages !== undefined && typeof value.combineImages !== 'boolean') return false;
  if (value.taxDeclaration !== undefined && typeof value.taxDeclaration !== 'boolean') return false;
  for (const field of ['accountType', 'currency', 'taxResidency']) {
    if (value[field] !== undefined && (typeof value[field] !== 'string' || value[field].length > 64)) return false;
  }
  return true;
}

const SAFE_PDF_DRAFT_KEYS = new Set(['requestType', 'step', 'acknowledged', 'combineImages']);

/** Keep only non-sensitive PDF submission wizard metadata suitable for sessionStorage.
 * @param {any} value
 */
export function validPdfDraftMeta(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.keys(value).some((k) => !SAFE_PDF_DRAFT_KEYS.has(k))) return false;
  if (value.requestType !== undefined && value.requestType !== 'ACCOUNT_OPENING' && !REQUEST_TYPES.has(value.requestType)) return false;
  if (value.step !== undefined && ![0, 1, 2, 3].includes(value.step)) return false;
  if (value.acknowledged !== undefined && typeof value.acknowledged !== 'boolean') return false;
  if (value.combineImages !== undefined && typeof value.combineImages !== 'boolean') return false;
  return true;
}
