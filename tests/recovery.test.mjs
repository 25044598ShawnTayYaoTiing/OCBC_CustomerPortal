import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sameFiles,
  validEformDraftMeta,
  validEformIntent,
  validIntent,
  validPdfDraftMeta,
} from '../src/lib/recovery.mjs';

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

const eformIntent = {
  key: 'eform-request-key-123',
  customerId: 'CUSTOMER-A',
  apiBase: 'https://api.example.test/api/customer',
  path: '/eforms/with-documents',
  returnTo: '/submit/digital?step=3&requestType=ADDRESS_CHANGE',
  requestType: 'ADDRESS_CHANGE',
  multipart: true,
  combineImages: false,
  bodySha256: 'd'.repeat(64),
  files: [first],
};

test('eform recovery intent validates route, identity, request type and body hash without PII', () => {
  assert.equal(validEformIntent(eformIntent, eformIntent.customerId, eformIntent.apiBase), true);
  assert.equal(validEformIntent({ ...eformIntent, incompleteSubmissionId: 'SUB-123' }, eformIntent.customerId, eformIntent.apiBase), true);
  assert.equal(validEformIntent({ ...eformIntent, incompleteSubmissionId: '../admin' }, eformIntent.customerId, eformIntent.apiBase), false);
  assert.equal(validEformIntent({ ...eformIntent, incompleteSubmissionId: 'x'.repeat(65) }, eformIntent.customerId, eformIntent.apiBase), false);
  assert.equal(validEformIntent({ ...eformIntent, submissionId: 'SUB-1', path: '/submissions/SUB-1/eform', returnTo: '/submissions/SUB-1/form', multipart: false, files: undefined }, eformIntent.customerId, eformIntent.apiBase), true);
  assert.equal(validEformIntent(eformIntent, 'CUSTOMER-B', eformIntent.apiBase), false);
  assert.equal(validEformIntent({ ...eformIntent, path: '/api/documents/rules' }, eformIntent.customerId, eformIntent.apiBase), false);
  assert.equal(validEformIntent({ ...eformIntent, returnTo: '//evil.example' }, eformIntent.customerId, eformIntent.apiBase), false);
  assert.equal(validEformIntent({ ...eformIntent, bodySha256: 'not-hex' }, eformIntent.customerId, eformIntent.apiBase), false);
});

test('persisted digital and pdf draft metadata rejects sensitive customer PII', () => {
  assert.equal(validEformDraftMeta({ stage: 2, requestType: 'TAX_RESIDENCY_UPDATE', taxResidency: 'United Kingdom', taxDeclaration: true, addressReady: false, combineImages: true }), true);
  assert.equal(validEformDraftMeta({ stage: 2, taxIdentifier: 'TIN-SECRET-123' }), false);
  assert.equal(validEformDraftMeta({ email: 'customer@example.com' }), false);
  assert.equal(validEformDraftMeta({ mailingAddress: '100 Rivervale Walk' }), false);
  assert.equal(validPdfDraftMeta({ requestType: 'ADDITIONAL_ACCOUNT', step: 1, acknowledged: true, combineImages: false }), true);
  assert.equal(validPdfDraftMeta({ requestType: 'ADDITIONAL_ACCOUNT', taxIdentifier: 'secret' }), false);
});
