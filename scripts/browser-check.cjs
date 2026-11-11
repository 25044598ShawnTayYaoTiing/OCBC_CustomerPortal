/* Real Chrome/HTTP verification. No successful API responses are mocked.
 * Optional staff credentials are used only by this Node script, never the portal.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const backend = path.resolve(process.env.AFI_BACKEND_ROOT || path.join(root, '../afi-resolve'));
const portal = process.env.PORTAL_URL || 'http://localhost:5174';
const apiBase = process.env.CUSTOMER_API_URL || 'http://localhost:5173/api/customer';
const privatePath = process.env.AFI_PRIVATE_DEMO_STATE || path.join(backend, '.local/customer-api-demo.json');
const state = JSON.parse(fs.readFileSync(privatePath, 'utf8'));
const original = ['customer-information.pdf', 'account-application.pdf', 'tax-residency.pdf'].map(name => path.join(root, 'demo-documents', name));
const corrected = path.join(root, 'demo-documents/tax-residency-corrected.pdf');
const out = path.join(root, '.local/browser');
fs.mkdirSync(out, { recursive: true });

async function visible(locator, timeout = 30000) { await locator.first().waitFor({ state: 'visible', timeout }); }
async function login(page) {
  await page.getByLabel('Customer username', { exact: true }).fill(state.primary.username);
  await page.getByLabel('Password', { exact: true }).fill(state.primary.password);
  const response = page.waitForResponse(r => r.url().endsWith('/auth/token') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const session = await (await response).json();
  assert.equal(session.tokenType, 'Bearer');
  await visible(page.getByRole('button', { name: 'Sign out', exact: true }));
  return session;
}

(async () => {
  const { execFileSync } = require('node:child_process');
  const sourceBefore = execFileSync('git', ['-C', backend, 'diff', '--binary']);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  let report = {};
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(portal + '/submissions');
    await visible(page.getByRole('heading', { name: 'Sign in to your portal' }));
    await page.screenshot({ path: path.join(out, 'login-desktop.png'), fullPage: true });
    let session = await login(page);
    console.log('Browser check: real customer login succeeded.');
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await visible(page.getByRole('heading', { name: /Welcome back/ }));
    await page.screenshot({ path: path.join(out, 'overview-desktop.png'), fullPage: true });
    const before = await page.evaluate(async ({ apiBase, token }) => {
      const r = await fetch(apiBase + '/submissions', { headers: { Authorization: 'Bearer ' + token }, credentials: 'omit' });
      return r.json();
    }, { apiBase, token: session.accessToken });
    await page.getByRole('link', { name: 'Submit new documents' }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Choose PDF documents', { exact: true }).setInputFiles(original);
    await visible(page.getByText('customer-information.pdf', { exact: true }));
    await page.getByRole('button', { name: 'Review documents', exact: true }).click();
    await page.getByRole('checkbox').check();

    // Commit a real upload, then deliberately lose its response. The portal must
    // retain the request key, survive a refresh/sign-in, and replay without a new case.
    const keys = [];
    page.on('request', request => {
      if (request.method() === 'POST' && request.url() === apiBase + '/submissions') keys.push(request.headers()['idempotency-key']);
    });
    await page.evaluate(() => {
      const actualFetch = window.fetch.bind(window);
      let dropNextUpload = true;
      window.fetch = async (input, init) => {
        const response = await actualFetch(input, init);
        if (dropNextUpload && init?.method === 'POST' && String(input).endsWith('/api/customer/submissions') && response.ok) {
          dropNextUpload = false;
          await response.clone().arrayBuffer();
          throw new TypeError('Deliberate verification-only response loss after the real request completed');
        }
        return response;
      };
    });
    const committed = page.waitForResponse(r => r.url() === apiBase + '/submissions' && r.request().method() === 'POST', { timeout: 600000 });
    await page.getByRole('button', { name: 'Submit application', exact: true }).click();
    const initialResponse = await committed;
    if (initialResponse.status() !== 200) {
      const error = await initialResponse.json().catch(() => ({}));
      throw new Error(`Real intake failed: ${initialResponse.status()} ${error.code || ''}: ${error.message || ''}`);
    }
    const recorded = await initialResponse.json();
    console.log('Browser check: real intake committed; verifying uncertain-result recovery.');
    await visible(page.getByRole('button', { name: 'Retry original request', exact: true }), 30000);
    assert.equal(await page.getByText('Your documents are received.', { exact: true }).count(), 0);
    await page.screenshot({ path: path.join(out, 'uncertain-upload.png'), fullPage: true });
    await page.reload();
    await visible(page.getByRole('heading', { name: 'Sign in to your portal' }));
    session = await login(page);
    await visible(page.getByRole('heading', { name: 'Restore your upload' }));
    await page.getByLabel('Choose PDF documents', { exact: true }).setInputFiles(original);
    await page.getByRole('button', { name: 'Review documents', exact: true }).click();
    await page.getByRole('checkbox').check();
    const replay = page.waitForResponse(r => r.url() === apiBase + '/submissions' && r.request().method() === 'POST', { timeout: 600000 });
    await page.getByRole('button', { name: 'Retry original request', exact: true }).click();
    const confirmed = await (await replay).json();
    assert.equal(confirmed.submission.id, recorded.submission.id);
    assert.equal(new Set(keys).size, 1, 'The retry must retain the original key');
    assert.equal(confirmed.submission.status, 'CORRECTION_REQUIRED');
    assert.equal(confirmed.corrections.length, 2);
    await visible(page.getByText('Your documents are received.', { exact: true }));
    const id = confirmed.submission.id;
    await page.screenshot({ path: path.join(out, 'submission-confirmation.png'), fullPage: true });
    await page.getByRole('link', { name: 'Track this submission' }).click();
    await visible(page.getByRole('heading', { name: 'Your application', exact: true }));
    await visible(page.locator('article.correction-card').filter({ hasText: /tax declaration/i }));
    await page.screenshot({ path: path.join(out, 'corrections-desktop.png'), fullPage: true });

    let staffPage;
    if (process.env.AFI_STAFF_PASSWORD) {
      staffPage = await context.newPage();
      await staffPage.goto(process.env.AFI_STAFF_URL || 'http://localhost:5173');
      await staffPage.getByLabel('Username', { exact: true }).fill(process.env.AFI_STAFF_USERNAME || 'reviewer');
      await staffPage.getByLabel('Password', { exact: true }).fill(process.env.AFI_STAFF_PASSWORD);
      await staffPage.getByRole('button', { name: 'Sign in to workspace' }).click();
      await visible(staffPage.getByRole('heading', { name: 'Operations overview' }));
      await staffPage.getByRole('link', { name: 'Submissions', exact: true }).click();
      await staffPage.getByLabel('Filter by source', { exact: true }).selectOption('CUSTOMER_PORTAL');
      await staffPage.locator('.table-toolbar input[type=search]').fill(id);
      const row = staffPage.locator('tr').filter({ has: staffPage.locator(`a[href^="/submissions/${id}"]`) });
      await visible(row); assert.match(await row.innerText(), /Customer Portal/);
      await staffPage.screenshot({ path: path.join(out, 'staff-received.png'), fullPage: true });
      await row.locator('a.record-link').click();
      await visible(staffPage.getByText('2 issues need attention', { exact: true }));
      await staffPage.screenshot({ path: path.join(out, 'staff-open-detail.png'), fullPage: true });
      await staffPage.locator('.document-toolbar select').first().selectOption(recorded.documents.find(d => d.type === 'TAX_RESIDENCY').id);
    }

    await page.locator('article.correction-card').filter({ hasText: /tax declaration/i }).getByRole('button', { name: 'Upload correction', exact: true }).click();
    await page.getByLabel('Choose corrected PDF', { exact: true }).setInputFiles(corrected);
    await visible(page.getByText('tax-residency-corrected.pdf', { exact: true }));
    const correction = page.waitForResponse(r => r.url().endsWith('/replacement') && r.request().method() === 'POST', { timeout: 600000 });
    await page.getByRole('button', { name: 'Submit correction', exact: true }).click();
    const result = await (await correction).json();
    assert.equal(result.submission.status, 'OPERATIONS'); assert.deepEqual(result.corrections, []);
    await visible(page.getByRole('heading', { name: 'Your application is with Operations.', exact: true }));
    await visible(page.locator('.no-requests strong'));
    await page.screenshot({ path: path.join(out, 'operations-desktop.png'), fullPage: true });
    if (staffPage) {
      // Keep the detail open during the customer correction: no navigation or
      // manual RM refresh may be needed for the newer version and routed state.
      await visible(staffPage.getByText('Package received by Operations', { exact: true }));
      await staffPage.getByLabel('Document version', { exact: true }).getByRole('option', { name: 'Version 2 (current)', exact: true }).waitFor({ state: 'attached' });
      await staffPage.screenshot({ path: path.join(out, 'staff-synchronised-detail.png'), fullPage: true });
      await staffPage.getByRole('link', { name: 'Operations', exact: true }).click();
      await staffPage.locator('.table-toolbar input[type=search]').fill(id);
      const row = staffPage.locator('tr').filter({ has: staffPage.locator(`a[href^="/submissions/${id}"]`) });
      await visible(row);
      await visible(row.getByText('With Operations', { exact: true }));
      await staffPage.screenshot({ path: path.join(out, 'staff-operations.png'), fullPage: true });
    }
    const checks = await page.evaluate(async ({ apiBase, token, sourceId }) => {
      const headers = { Authorization: 'Bearer ' + token };
      const history = await (await fetch(apiBase + '/submissions', { headers, credentials: 'omit' })).json();
      const inbox = await (await fetch(apiBase + '/notifications', { headers, credentials: 'omit' })).json();
      const denied = await fetch(apiBase + '/submissions/' + sourceId, { headers, credentials: 'omit' });
      const storage = JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } });
      return { history, types: inbox.map(n => n.type), denied: denied.status, tokenPersisted: storage.includes(token) };
    }, { apiBase, token: session.accessToken, sourceId: state.sourceId });
    assert.equal(checks.history.length, before.length + 1);
    assert.equal(checks.denied, 404); assert.equal(checks.tokenPersisted, false);
    assert.ok(checks.types.includes('CORRECTION_REQUIRED') && checks.types.includes('OPERATIONS_READY'));
    await page.getByRole('link', { name: 'Notifications', exact: true }).click();
    await visible(page.getByRole('heading', { name: 'Notifications', exact: true }));
    await page.getByLabel('Filter notifications').selectOption('OPERATIONS_READY');
    await visible(page.getByText('Your application is with Operations', { exact: true }));
    await page.screenshot({ path: path.join(out, 'notifications-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('link', { name: 'My submissions', exact: true }).click();
    await visible(page.getByRole('heading', { name: 'My submissions', exact: true }));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(out, 'history-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('link', { name: 'Account & profile', exact: true }).click();
    await visible(page.getByRole('heading', { name: 'Account & profile', exact: true }));
    await page.screenshot({ path: path.join(out, 'profile-mobile.png'), fullPage: true });
    const loggedOut = page.waitForResponse(r => r.url().endsWith('/auth/logout'));
    await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
    assert.equal((await loggedOut).status(), 204);
    await visible(page.getByRole('heading', { name: 'Sign in to your portal' }));
    const revoked = await context.request.get(apiBase + '/me', { headers: { Authorization: 'Bearer ' + session.accessToken } });
    assert.equal(revoked.status(), 401);
    assert.deepEqual(errors, [], 'The portal should not produce browser JavaScript exceptions');
    assert.deepEqual(execFileSync('git', ['-C', backend, 'diff', '--binary']), sourceBefore, 'Existing application source must remain unchanged');
    report = { passed: true, caseId: id, status: result.submission.status, outstandingRequests: result.corrections.length,
      sourceCaseVisible: checks.denied === 200, duplicateCases: checks.history.length - before.length - 1,
      staffDashboardVerified: !!staffPage, retryAfterLostResponseAndRefresh: true, tokenPersisted: checks.tokenPersisted,
      openStaffDetailSynchronised: !!staffPage,
      browserErrors: errors.length, verifiedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('PASS real Chrome: login, multi-PDF intake, lost-response recovery after refresh, same-key retry, correction and Operations.');
    console.log('PASS notification filtering, mobile navigation, ownership denial, memory-only session, logout revocation and unchanged backend source.');
    console.log('Staff dashboard verified: ' + !!staffPage);
    console.log('Case: ' + id);
  } finally { await browser.close(); }
})().catch(error => {
  let message = error.message;
  for (const secret of [state.primary.password, process.env.AFI_STAFF_PASSWORD]) if (secret) message = message.split(secret).join('[redacted]');
  console.error(message); process.exitCode = 1;
});
