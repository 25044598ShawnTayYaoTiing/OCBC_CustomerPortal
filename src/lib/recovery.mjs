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
    && typeof value.path === 'string' && /^\/submissions(?:\/[\w-]+\/documents(?:\/[\w-]+\/replacement)?)?$/.test(value.path)
    && typeof value.returnTo === 'string' && /^\/(?:submit|submissions\/[\w-]+)$/.test(value.returnTo)
    && Array.isArray(value.files) && value.files.length > 0 && value.files.length <= 10
    && value.files.every((/** @type {any} */ f) => f && typeof f.name === 'string' && f.name.length <= 200
      && typeof f.size === 'number' && f.size > 0 && f.size <= 10 * 1024 * 1024
      && typeof f.sha256 === 'string' && /^[a-f0-9]{64}$/.test(f.sha256));
}
