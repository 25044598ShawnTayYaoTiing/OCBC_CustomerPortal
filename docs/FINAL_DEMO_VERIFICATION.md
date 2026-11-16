# Final OneMap and customer portal verification

Date: 17 November 2026, Asia/Singapore.

## Verified outcome

AWS backend release: 88424d651471da341489131cc62ad82da6476107.
The portal redesign was first deployed in 8adce25, followed by the small copy
polish in the release containing this report. Vercel deployment and production
bundle were independently checked, followed by real Chrome interactions.

OneMap now issues an access token from EC2 (HTTP 200), and live search for postal
code 200640 returns one candidate. The deployed customer endpoint returns
LIVE_RESULTS with ONEMAP_LIVE provenance. No credentials or tokens were printed.

## Root cause and configuration repair

The current host credential pair is valid. Three historical problems had to be
separated: an earlier password failed OneMap's length validation; the host AWS
Compose file had not been synchronised with the repository's alias mapping;
and the updated unquoted password contained dollar signs, which Compose expanded.
The API alias mappings were added on the host, and the private password was quoted
as a literal. Effective container values were compared privately with the intended
values. Only the backend was recreated, using its same image; frontend and AI
container IDs were unchanged. Health is healthy with zero process restarts.
Private rollback snapshots remain in the existing host deployment backup folder.
No IAM, RDS, S3, TLS or draft policy changes were made.

## Live synthetic workflow

The browser-controlled verification used an isolated Chrome test browser with
normal customer and staff authentication, no API interception and no fabricated
responses. The case was DOC-5ad92cd1-6904-43da-9230-c5143636a676:

1. Signed into the deployed Vercel portal.
2. Selected a mailing-address change, searched 200640 and selected a live address.
3. Confirmed authorisation and submitted the digital request.
4. Saw exactly one supporting-document action on desktop and mobile.
5. Uploaded one generated synthetic address-proof PDF through the browser.
6. Gemini extraction returned HTTP 200; automatic revalidation reached staff review.
7. Staff evidence contained VERIFIED OneMap results, no failed checks and risk zero.
8. Signed into the AWS dashboard and clicked Approve for Operations.
9. Backend recorded OPERATIONS, and the customer portal displayed Sent for processing.

This is the document/eForm-to-Operations workflow with integrated live address
lookup and backend revalidation. The older dedicated address-register approvals
remain separate and accessible as history. Operations means processing handover,
not completed bank fulfilment or an immediate customer-profile/address mutation.

## Tests and evidence

- Six focused customer-action and upload-recovery tests passed.
- Production TypeScript/Vite build passed.
- Live Chrome checks passed at desktop and 390px mobile widths, with no horizontal
  overflow. Closed mobile navigation is unmounted, and Escape closes the drawer.
- Direct production browser checks recorded no page errors or failed requests.
- The full browser journey recorded no page errors; one notification request was
  cancelled with ERR_ABORTED during navigation, rather than a server failure.
- Two real Gemini supporting-document uploads succeeded in the focused verification;
  no 503 reproduced. This sample does not prove general provider availability.
- ONEMAP_MAILING and ONEMAP_RESIDENTIAL remain DRAFT. Their document-routing policy
  effects were not activated. Recorded verification evidence is available to staff.
- Before/after screenshots and sanitised JSON results are stored in the main
  workspace under afi-resolve/.local/aws-audit/final-ux. No credential state is
  included in the repository or this report.

## Scope and limits

The customer interface has four main destinations, one primary next action,
customer-facing status names, integrated address selection, collapsed references
and history, and no internal rule IDs, risk scores or model metadata in normal
views. Backend findings, evidence, authorization and audit history are preserved.

This release qualifies the tested synthetic mailing-address journey. It is not
an exhaustive device/accessibility audit or qualification of every banking service,
100-account credential migration, email/SMS delivery, real banking fulfilment or
provider reliability. No bulk account/password reset was performed.
