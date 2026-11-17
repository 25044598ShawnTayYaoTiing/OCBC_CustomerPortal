const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const origin = process.argv[2] || "http://127.0.0.1:5174";
const out = path.resolve(".local/customer-flow");
fs.mkdirSync(out, { recursive: true });
const profile = {
  id: "CUSTOMER-UX",
  name: "Prototype User",
  customerReference: "SYN-UX-001",
  bankingProfile: {
    identityNumber: "DEMO-ID-001",
    mailingAddress: "1 FICTIONAL ROAD",
    residentialAddress: "1 FICTIONAL ROAD",
    email: "demo@example.invalid",
    mobile: "+65 80000000",
    taxResidency: "Singapore",
    accountType: "SAVINGS",
    currency: "SGD",
  },
};
const base = {
  id: "DOC-UX",
  caseReference: "DOC-UX",
  status: "RESOLUTION_MANAGEMENT",
  revision: 2,
  requestType: "ADDRESS_CHANGE",
  captureMethod: "DIGITAL_EFORM",
  createdAt: "2026-11-17T02:00:00Z",
  validatedAt: "2026-11-17T02:01:00Z",
  routedAt: null,
  canCancel: true,
  cancellationReason: "You can cancel before Operations handover.",
};
const pdf = (name) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\nSynthetic supporting document\n%%EOF"),
});
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    let sent = 0,
      cancellations = 0,
      failCancel = true,
      failSubmit = true;
    let formBody = "",
      key = "";
    let detail = {
      submission: { ...base },
      documents: [
        {
          id: "FORM",
          type: "SERVICE_REQUEST",
          filename: "declaration.pdf",
          version: 1,
          captureMethod: "DIGITAL_EFORM",
        },
        {
          id: "SUPPORT",
          type: "SUPPORTING_DOCUMENT",
          filename: "bill-replaced.pdf",
          version: 1,
        },
      ],
      corrections: [],
      requirements: [],
    };
    await context.route("**/api/customer/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      const endpoint = url.pathname.replace(/^.*\/api\/customer/, "");
      let body = {},
        status = 200;
      if (endpoint === "/auth/token")
        body = {
          accessToken: "fixture-token",
          tokenType: "Bearer",
          expiresAt: "2099-01-01T00:00:00Z",
        };
      else if (endpoint === "/me") body = profile;
      else if (endpoint === "/notifications") body = [];
      else if (endpoint.startsWith("/addresses/search"))
        body = {
          status: "VERIFIED",
          source: "SYNTHETIC_DEMO",
          candidates: [
            {
              id: "B",
              address: "2 DEMO STREET SINGAPORE 123456",
              postalCode: "123456",
            },
          ],
        };
      else if (endpoint === "/submissions")
        body = [
          detail.submission,
          {
            ...base,
            id: "DOC-LOCKED",
            caseReference: "DOC-LOCKED",
            status: "OPERATIONS",
            canCancel: false,
            cancellationReason: "Already sent for processing.",
          },
        ];
      else if (endpoint === "/eforms/with-documents") {
        sent++;
        assert.match(req.headers()["content-type"], /multipart\/form-data/);
        assert.match(req.postData(), /bill-replaced.pdf/);
        assert.match(req.postData(), /2 DEMO STREET/);
        if (!key) key = req.headers()["idempotency-key"];
        else assert.equal(req.headers()["idempotency-key"], key);
        formBody = req.postData();
        if (failSubmit) {
          failSubmit = false;
          return route.abort("failed");
        }
        body = detail;
      } else if (endpoint.endsWith("/cancel")) {
        cancellations++;
        assert.equal(req.postDataJSON().expectedRevision, 2);
        if (failCancel) {
          failCancel = false;
          status = 409;
          body = {
            code: "NOT_CANCELLABLE",
            message:
              "The request is being processed. Refresh for the latest status.",
          };
        } else {
          detail.submission = {
            ...detail.submission,
            status: "CANCELLED",
            canCancel: false,
            revision: 3,
          };
          body = detail;
        }
      } else if (endpoint.endsWith("/eform"))
        body = {
          values: {
            requestType: "ADDRESS_CHANGE",
            mailingAddress: "2 DEMO STREET",
          },
        };
      else if (endpoint.includes("/submissions/")) body = detail;
      return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("Browser error: " + e.message);
    });
    page.setDefaultTimeout(15000);
    await page.goto(origin + "/submit/digital");
    await page.getByLabel("Customer username", { exact: true }).fill("User1");
    await page.getByLabel("Password", { exact: true }).fill("Password123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "Continue to your changes", exact: true })
      .click();
    await page.getByLabel("New postal code", { exact: true }).fill("123456");
    await page
      .getByRole("button", { name: "Find address", exact: true })
      .click();
    await page.getByRole("radio").check();
    await page
      .getByLabel("Unit number (if applicable)", { exact: true })
      .fill("#12-34");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Continue to documents", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Continue to review", exact: true })
      .click();
    await page
      .getByText("Add a supporting PDF matching the requirements below.", {
        exact: true,
      })
      .waitFor();
    await page
      .getByLabel("Choose PDF documents", { exact: true })
      .setInputFiles(pdf("bill.pdf"));
    await page
      .getByRole("button", { name: "Preview bill.pdf", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Preview bill.pdf" }).waitFor();
    await page
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Replace bill.pdf", exact: true })
      .click();
    await page
      .getByLabel("Choose replacement PDF", { exact: true })
      .setInputFiles(pdf("bill-replaced.pdf"));
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page
      .getByLabel("Unit number (if applicable)", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByLabel("Unit number (if applicable)", { exact: true })
        .inputValue(),
      "#12-34",
    );
    await page
      .getByRole("button", { name: "Continue to documents", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Preview bill-replaced.pdf", exact: true })
      .waitFor();
    await page.goBack();
    await page
      .getByRole("button", { name: "Continue to documents", exact: true })
      .waitFor();
    await page.goForward();
    await page
      .getByRole("button", { name: "Continue to review", exact: true })
      .waitFor();
    await page.locator('.form-actions a[href="/submissions"]').click();
    await page.waitForURL("**/submissions");
    await page
      .getByRole("link", { name: "New request", exact: true })
      .first()
      .click();
    await page
      .getByRole("link", { name: "Start a request", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Continue to your changes", exact: true })
      .click();
    await page
      .getByText("Current requested address:", { exact: false })
      .waitFor();
    await page
      .getByRole("button", { name: "Continue to documents", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Preview bill-replaced.pdf", exact: true })
      .waitFor();
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: path.join(out, "debug-" + width + ".png"),
        fullPage: true,
      });
      if (
        !(await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ))
      )
        console.log(
          await page.evaluate(() =>
            [...document.querySelectorAll("*")]
              .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 12)
              .map((e) => ({
                tag: e.tagName,
                cls: e.className,
                right: e.getBoundingClientRect().right,
              })),
          ),
        );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Creation overflow " + width,
      );
      await page.screenshot({
        path: path.join(out, "documents-" + width + ".png"),
        fullPage: true,
      });
    }
    await page
      .getByRole("button", { name: "Continue to review", exact: true })
      .click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page
      .getByRole("button", { name: "Continue to review", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Submit service request", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Retry original request", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Retry original request", exact: true })
      .click();
    await page.waitForURL("**/submissions/DOC-UX");
    assert.equal(sent, 2);
    assert(formBody.includes("bill-replaced.pdf"));
    await page
      .getByRole("link", { name: "My requests", exact: true })
      .first()
      .click();
    await page.waitForURL("**/submissions");
    const active = page
      .locator("article.request-history-card")
      .filter({ hasText: "DOC-UX" });
    const locked = page
      .locator("article.request-history-card")
      .filter({ hasText: "DOC-LOCKED" });
    assert(
      await locked
        .getByRole("button", { name: "Cancel request", exact: true })
        .isDisabled(),
    );
    await active
      .getByRole("button", { name: "Cancel request", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Cancel this service request?",
    });
    assert(
      await dialog
        .getByRole("button", { name: "Keep request", exact: true })
        .evaluate((el) => el === document.activeElement),
    );
    await page.keyboard.press("Escape");
    assert.equal(cancellations, 0);
    await active
      .getByRole("button", { name: "Cancel request", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Confirm cancellation", exact: true })
      .click();
    await dialog
      .getByText(
        "The request is being processed. Refresh for the latest status.",
        { exact: true },
      )
      .waitFor();
    await dialog
      .getByRole("button", { name: "Confirm cancellation", exact: true })
      .click();
    await active
      .getByText("Cancelled by you. No further action is required.", {
        exact: true,
      })
      .waitFor();
    assert.equal(cancellations, 2);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => scrollTo(0, 0));
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "History overflow " + width,
      );
      await page.screenshot({
        path: path.join(out, "requests-" + width + ".png"),
        fullPage: true,
      });
    }
    await page
      .getByRole("link", { name: "New request", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Choose PDF files", exact: true })
      .click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByLabel("Choose PDF documents", { exact: true })
      .setInputFiles(pdf("pdf-package.pdf"));
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("button", { name: "Preview pdf-package.pdf", exact: true })
      .waitFor();
    await page
      .getByRole("button", {
        name: "Choose another submission method",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Choose PDF files", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Preview pdf-package.pdf", exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
    const report = {
      passed: true,
      backAndBrowserHistory: true,
      pdfMethodDraftRetained: true,
      filesRetained: true,
      missingSupportBlocked: true,
      previewAndReplacement: true,
      multipartDeclarationAndFiles: true,
      retryReusesKey: true,
      cancellationConfirmation: true,
      processingLocked: true,
      serverRejectionVisible: true,
      widths: [1440, 768, 390],
      errors,
    };
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
