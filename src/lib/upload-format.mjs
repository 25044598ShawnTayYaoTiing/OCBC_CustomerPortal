/** @param {File[]} files @param {number} max @param {boolean} combineImages */
export async function validateFiles(files, max = 10, combineImages = false) {
  if (!files.length || files.length > max) return `Choose 1 to ${max} PDF, JPG, JPEG or PNG files.`;
  if (files.reduce((n, file) => n + file.size, 0) > 100 * 1024 * 1024) return 'Keep the combined file size under 100 MB.';
  for (const file of files) {
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name) || file.name.length > 200 || !file.size || file.size > 10 * 1024 * 1024)
      return `${file.name}: choose a nonempty PDF, JPG, JPEG or PNG up to 10 MB.`;
    const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const pdf = new TextDecoder().decode(b.slice(0, 5)) === '%PDF-';
    const png = [137,80,78,71,13,10,26,10].every((v, i) => b[i] === v);
    const jpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
    if (!(pdf && /\.pdf$/i.test(file.name) || png && /\.png$/i.test(file.name) || jpg && /\.jpe?g$/i.test(file.name)))
      return `${file.name}: the file contents do not match a supported format.`;
  }
  if (new Set(files.map(f => `${f.name}:${f.size}:${f.lastModified}`)).size !== files.length) return 'The same file is selected more than once. Remove the duplicate.';
  if (combineImages && (files.some(file => !/\.(png|jpe?g)$/i.test(file.name)) || files.reduce((n, file) => n + file.size, 0) > 12 * 1024 * 1024))
    return 'Pages of one form must all be JPG or PNG images, at most 12 MB combined.';
  return '';
}
