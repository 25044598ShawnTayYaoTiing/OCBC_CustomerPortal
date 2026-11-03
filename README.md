# AFI Banking Demo — Customer Portal

Independent React/TypeScript customer portal for the existing AFI Resolve 2.0
backend. Original fictional branding, synthetic documents and real customer APIs.
There is no new backend, database, AI service, bank balance or payment workflow.

The current interface uses the AFI Resolve internal dashboard's exact blue,
navy and neutral palette, with its existing business-banking layout inspired by
public OCBC references. See the [palette source and values](docs/theme-palette.md)
and [design references and implementation notes](docs/design-reference.md).
AFI's branding, artwork and sign-in composition are original, with visible demo
disclaimers throughout.

```text
OCBCIgnitte/
├── AFI_OCBC_IGNITE/          # Existing dashboard/backend/AI; unchanged by this project
└── customer-portal/
    ├── src/
    │   ├── lib/             # API client and scoped upload retry metadata
    │   ├── components/      # Navigation, files, timeline and shared controls
    │   ├── pages/           # Customer pages and correction workflow
    │   ├── auth.tsx         # In-memory bearer sessions and protected routes
    │   └── data.tsx         # Scoped reads and 15-second refresh
    ├── demo-documents/      # Four synthetic PDF fixtures
    ├── tests/               # Focused retry safety checks
    ├── scripts/             # Optional real Chrome walkthrough
    ├── .env.example
    └── vercel.json
```

## Local development

Requirements: Node 22+ and the existing AFI Resolve backend running. The normal
local Docker setup exposes its customer API at `http://localhost:5173/api/customer`.

```powershell
cd C:\Users\goati\Downloads\OCBCIgnitte\customer-portal
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open **http://localhost:5174**. Use `localhost`, rather than `127.0.0.1`, because
the backend's default allowed portal origin is exactly `http://localhost:5174`.
No Vite proxy is used: browser requests exercise the backend's real CORS policy.

Required public environment variable:

```dotenv
VITE_API_BASE_URL=http://localhost:5173/api/customer
```

The value must be the **complete customer API prefix**, ending in `/api/customer`.
Use the public HTTPS AWS API URL in production. HTTP is accepted only for local
loopback development. Configuration is read at build time: rebuild after changes.
`.env.local` is ignored and only contains the local public API URL. Never put staff
passwords, customer passwords, AWS credentials, Gemini keys or bearer tokens in
`VITE_*` variables, source files, static assets or Vercel build output.

The existing backend must separately allow the exact portal origin through
`CUSTOMER_PORTAL_ORIGINS`. This frontend cannot grant itself CORS access. No backend
or AWS configuration was changed for this project.

## Customer accounts and authentication

Sign in with a **provisioned customer account**, not an internal operator/reviewer
account. This portal calls `POST /auth/token`, then `GET /me`. Bearer tokens and
passwords are never stored in localStorage, sessionStorage, IndexedDB or cookies.
The token remains in JavaScript memory and is attached only to the configured
customer API. All fetch requests use `credentials: 'omit'`.

Refreshing or closing the app requires another sign-in. Expiry timers, window
focus checks and server 401 responses clear the local session. Logout calls the
backend revocation endpoint and always clears local credentials. If revocation
cannot be confirmed, the sign-in screen says so; the server token then expires
according to the existing backend policy. There is no invented refresh-token,
registration, password-reset or profile-update flow.

For the already provisioned local demonstration, an administrator can obtain
customer credentials from the existing backend's ignored private file:
`AFI_OCBC_IGNITE/.local/customer-api-demo.json` (`primary.username` and
`primary.password`). Do not copy that file into the portal or commit it.

To provision another synthetic customer, a staff reviewer uses the existing
`POST /api/documents/customers` endpoint from a private administrative tool. Its
body includes `username`, `password`, `customerName`, `customerReference` (SYN-),
`relationshipManager`, and optionally `repositorySubmissionId`. See the existing
`AFI_OCBC_IGNITE/docs/customer-api-integration.md` for the full contract. Customer
references are unique; the fixture PDFs use `SYN-ALEX-001`, so use the existing
Alex demo identity for these files. Provisioning is never performed from the
public customer frontend, and staff credentials are never requested by it.

## Pages and behaviour

| Route | Function |
| --- | --- |
| `/login` | Real customer authentication, useful errors and session notices. |
| `/` | Real submission counts, recent submissions, attention cases and latest notifications. |
| `/submit` | Account-opening information, multi-PDF upload, review, acknowledgement and actual confirmation. |
| `/submissions` | Searchable history, status filters and chronological sorting. |
| `/submissions/:id` | Current status/documents, customer-readable requests, corrections and recorded updates. |
| `/corrections` | Outstanding requests for cases marked for correction/review. |
| `/notifications` | Persisted notifications with type filtering and timestamps. |
| `/profile` | Provisioned identity, customer reference, session expiry and logout. |

Desktop sidebar, mobile navigation, keyboard focus, native modal dialogs,
reduced-motion support, readable empty/error states and consistent statuses are
included. Times are shown in Singapore time (SGT).

Only account opening is currently supported. Identity, reference, case ownership
and submission source are assigned by the backend; the portal does not send
customer-supplied ownership claims. File classification is also server-side.
Client checks only PDF extension/magic bytes, nonempty content, filename length,
file count and file size; it does not reproduce extraction or banking validation.

## Integrated API contract

Paths below are relative to `VITE_API_BASE_URL`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/token` | `{username,password}` → `{accessToken,tokenType,expiresAt}`. |
| POST | `/auth/logout` | Revoke the current session (204). |
| GET | `/me` | `{id,name,customerReference}`. |
| GET | `/submissions` | Customer-owned summaries, including reference, status, revision and timestamps. |
| POST | `/submissions` | Real multi-PDF intake and synchronous backend processing. |
| GET | `/submissions/:id` | `{submission,documents,corrections}` customer-safe detail. |
| GET | `/submissions/:id/corrections` | Safe outstanding request instructions and affected document IDs. |
| POST | `/submissions/:id/documents` | Add missing documents to an existing case. |
| POST | `/submissions/:id/documents/:documentId/replacement` | Replace one affected PDF. |
| GET | `/notifications` | Latest 100 persisted customer notifications. |

All uploads use multipart parts named `files`, preserve filenames/order and carry
`Idempotency-Key`. Up to 10 PDFs are allowed for intake/addition; replacements
accept one. Each PDF is at most 10 MB; this UI caps combined selection at 100 MB
to leave room under the backend's 105 MB multipart limit. The backend additionally
enforces parser page limits, supported synthetic content, ownership and type.

Actual statuses are `DRAFT`, `PENDING_VALIDATION`, `CORRECTION_REQUIRED`,
`HUMAN_REVIEW`, `READY`, `OPERATIONS`. The timeline uses recorded timestamps and
current status. It never marks individual Gemini steps or automated actions as
completed without API evidence. `READY` and `OPERATIONS` are the only statuses
shown as satisfying required checks. Operations handover uses `routedAt`.

A correction opens a dialog containing the backend instruction. Choose the
actual affected document when a cross-document issue references several IDs.
Missing documents use the add endpoint; existing forms use the replacement
endpoint. A successful upload refreshes the application and inbox. A request is
shown as closed only if it disappears from the backend's outstanding list.
Operations packages are locked to new changes, while an uncertain earlier request
can still be safely replayed with its original key.

## Long requests and safe retries

The backend processes uploads synchronously. The portal allows up to ten minutes
for the request and shows a waiting state, not a fabricated progress percentage.
Confirmation appears only after a successful, readable backend acknowledgement.

Before sending, the portal generates one request key and fingerprints the ordered
PDF filenames, sizes and SHA-256 hashes. Network failures, timeouts, server errors
or an unreadable success response retain the key. Retry sends the same operation
and exact files, so the backend returns the existing case rather than processing
it again. File-order controls help restore an original selection.

Only retry metadata is retained in sessionStorage, scoped by API URL and customer
ID. It contains no token, password or PDF bytes. After refresh/sign-in, reselect
the original PDFs; their hashes and order must match. A different customer cannot
reuse the metadata. Closing the tab removes browser session metadata. If browser
storage is disabled, recovery is limited to the current in-memory tab.

The API has no lookup by idempotency key. “Check your submissions” shows genuine
history but never guesses which case corresponds to an uncertain request. Exact
replay is the reliable confirmation method. If the original files are lost, ask
the administrator to reconcile the case before clearing browser retry metadata
or intentionally starting another request. The UI blocks starting a competing
upload while an earlier one still needs confirmation.

400/409/413/422 errors show genuine validation feedback; 401 signs the customer
out; 403/404 explain access restrictions; 429 requests a pause; 5xx/network failures
keep the upload outcome uncertain. No automatic loop retries a mutation.

## Demo walkthrough

1. Keep the existing AFI Resolve stack running at `http://localhost:5173`.
2. Start this portal at `http://localhost:5174` and sign in as the provisioned Alex customer.
3. Submit `demo-documents/customer-information.pdf`, `account-application.pdf`
   and `tax-residency.pdf` through the four-step wizard.
4. Wait for the actual reference, then open **Track this submission**.
5. Inspect the address mismatch and missing-date requests. Eligible supporting
   evidence is attached only when the account has an authorised, matching,
   unexpired repository source configured in the backend.
6. Open the existing staff dashboard separately. Filter Submissions by
   **Customer Portal** and search the real case reference.
7. In this portal, upload `tax-residency-corrected.pdf` as a replacement for the
   tax declaration. The backend performs extraction and revalidation again.
8. When the actual status becomes `OPERATIONS`, both interfaces show the handover.

If no authorised supporting evidence exists, that requirement remains open.
If live Gemini is unavailable, supported templates may use the backend's labelled
fallback; unsupported inputs may fail. The customer API does **not** expose AI
provenance, so this portal never calls a result “live Gemini verified.” Use the
staff dashboard to demonstrate actual extraction method and detailed evidence.

## Production build and Vercel

```powershell
npm ci
npm run test
npm run build
```

Deploy this folder as its own repository/project in Vercel:

1. Import **customer-portal** as the Vercel project root; choose the Vite framework.
2. Set `VITE_API_BASE_URL=https://your-public-aws-api-domain/api/customer` for the
   intended environment. Do not use localhost in a public deployment.
3. Use build command `npm run build` and output directory `dist`.
4. Deploy. `vercel.json` supplies SPA routing fallback and basic response headers.
5. Have the backend administrator allow that exact Vercel/custom-domain origin.
   Each preview origin must be allowed separately; there is no wildcard shortcut.
6. Verify direct deep links, login, upload and correction against the HTTPS API.

The AWS customer API must already be publicly reachable over valid HTTPS, with
trusted forwarding headers and private database/AI/storage services. CORS is not
authentication. This frontend neither changes AWS infrastructure nor exposes any
internal service through Vercel. No Vercel deployment was performed here.

Deployment references: [Vercel's official Vite/SPA guide](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas)
and [Vite's environment-variable guide](https://vite.dev/guide/env-and-mode.html).

## Minimal verification

`npm test` covers retry file identity/order, identity/API scoping and rejection of
unsafe persisted routes. `npm run build` performs strict TypeScript checking and
a production Vite build.

With Chrome installed and the local backend running, `npm run verify:browser`
uses the existing ignored private demo account file by default. Override its path
with `AFI_PRIVATE_DEMO_STATE` if necessary. Optional Node-only variables
`AFI_STAFF_PASSWORD`, `AFI_STAFF_USERNAME` and `AFI_STAFF_URL` enable a parallel
staff dashboard check. Never prefix those credentials with `VITE_` or add them to
frontend configuration.

The walkthrough uses real APIs and PDF uploads. It deliberately loses the first
successful response, refreshes/signs in, restores the original files and confirms
the same request without creating another case. It then submits the correction,
checks Operations, notification filtering, mobile navigation, ownership denial,
memory-only authentication and logout revocation. Evidence is written only to
ignored `.local/browser/`. Existing backend source is compared before and after.

## Local verification results

### Verified locally on 3 November 2026

- Production TypeScript/Vite build passed; all three focused retry-safety tests passed.
- Real Chrome customer login, three-PDF submission, deliberately lost response,
  refresh/sign-in, same-key recovery, correction upload and Operations handover passed.
- The same case appeared in the existing staff Submissions and Operations queues.
  Backend records confirmed one verified automatic attachment and one routing record.
- Notification filtering, customer ownership denial, memory-only authentication,
  backend logout revocation, SPA deep links and mobile navigation/layout passed.
- No private credentials were found in `src/`, `public/` or the production bundle.
  The existing backend's source diff remained unchanged throughout the walkthrough.
- This run used explicitly recorded `DETERMINISTIC_FALLBACK` extraction and
  investigation. Live Gemini success is not claimed. Backend provider availability
  and its customer API's missing provenance field remain outside this frontend.
- Vercel publication and public AWS HTTPS connectivity were not exercised.

The completed case was `DOC-d3abb516-8c42-4e96-bc26-b963504debc9`. The response-loss
check reused the same request key and created exactly one case. Screenshots and
the machine-readable check report are under ignored `.local/browser/`.

## Backend capability limits

- No customer AI provenance or individual processing/automation event API; the
  portal only displays supported package-level status and safe notifications.
- No customer PDF download/preview or earlier-version API. The backend preserves
  versions; the portal shows the current version number only.
- History summaries omit document/task counts. Counts appear after loading detail;
  overview attention counts refer to applications, not individual correction tasks.
- No persisted read/unread notification state or actual email delivery.
- No profile editing, self-registration, password recovery, refresh token or
  browser session restoration endpoint.
- No reliable uncertain-case lookup without replaying the original request key
  and files; the portal does not invent a matching reference.
- Live Gemini availability and authorised supporting evidence remain backend
  prerequisites; neither is fabricated or supplied by this frontend.
