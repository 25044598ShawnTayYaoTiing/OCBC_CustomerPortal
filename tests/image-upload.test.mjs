import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFiles } from '../src/lib/upload-format.mjs';
import { validIntent } from '../src/lib/recovery.mjs';

test('PDF, JPG, JPEG and PNG content signatures match extensions', async () => {
  for (const [name, bytes] of [['form.pdf', Buffer.from('%PDF-1.7')], ['phone.jpg', [255,216,255,224]], ['screen.jpeg', [255,216,255,224]], ['scan.png', [137,80,78,71,13,10,26,10]]]) {
    assert.equal(await validateFiles([new File([new Uint8Array(bytes)], name)]), '');
  }
  assert.match(await validateFiles([new File(['<svg/>'], 'fake.png')]), /contents/);
  assert.match(await validateFiles([new File(['%PDF-1.7'], 'fake.jpg')]), /contents/);
  assert.match(await validateFiles([new File(['text'], 'form.heic')]), /nonempty PDF/);
});

test('grouped-image retry metadata survives a reload for service requests', () => {
  const intent = { customerId: 'customer', apiBase: 'https://example.test/api/customer', key: 'retry-key-123', path: '/submissions?requestType=ADDRESS_CHANGE', returnTo: '/submit', combineImages: true, files: [{ name: 'page.png', size: 500, sha256: 'a'.repeat(64) }] };
  assert.equal(validIntent(intent, intent.customerId, intent.apiBase), true);
  assert.equal(validIntent({ ...intent, combineImages: 'true' }, intent.customerId, intent.apiBase), false);
});
