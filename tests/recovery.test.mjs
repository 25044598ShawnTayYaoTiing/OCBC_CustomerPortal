import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameFiles, validIntent } from '../src/lib/recovery.mjs';

const first = { name: 'customer.pdf', size: 2000, sha256: 'a'.repeat(64) };
const second = { name: 'tax.pdf', size: 2400, sha256: 'b'.repeat(64) };
const intent = { customerId: 'CUSTOMER-A', apiBase: 'https://api.example.test/api/customer',
  key: 'original-request-key', path: '/submissions', returnTo: '/submit', files: [first, second] };

test('a safe retry must preserve bytes, names and file order', () => {
  assert.equal(sameFiles([first, second], [{ ...first }, { ...second }]), true);
  assert.equal(sameFiles([first, second], [second, first]), false);
  assert.equal(sameFiles([first], [{ ...first, sha256: 'c'.repeat(64) }]), false);
  assert.equal(sameFiles([first], [{ ...first, name: 'renamed.pdf' }]), false);
});
test('retry keys cannot migrate between customers or API environments', () => {
  assert.equal(validIntent(intent, intent.customerId, intent.apiBase), true);
  assert.equal(validIntent(intent, 'CUSTOMER-B', intent.apiBase), false);
  assert.equal(validIntent(intent, intent.customerId, 'https://other.example.test/api/customer'), false);
});
test('stored metadata cannot introduce staff routes or external redirects', () => {
  assert.equal(validIntent({ ...intent, path: '/api/documents/rules' }, intent.customerId, intent.apiBase), false);
  assert.equal(validIntent({ ...intent, returnTo: '//untrusted.example' }, intent.customerId, intent.apiBase), false);
  assert.equal(validIntent({ ...intent, files: [{ ...first, size: 11 * 1024 * 1024 }] }, intent.customerId, intent.apiBase), false);
  assert.equal(validIntent(null, intent.customerId, intent.apiBase), false);
});
