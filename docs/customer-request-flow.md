# Customer Portal request-flow improvements

Implemented 17 November 2026 against the existing Customer Portal and AWS backend.

The guided form now uses **Choose service → Your changes → Supporting documents → Review & send**. Back/Continue buttons and browser history retain the entered values and selected files. Returning through the request options or My Requests preserves the draft in the signed-in session. Drafts are held in memory and cleared on sign-out/session expiry; they do not survive refreshing or closing the application.

Service-specific preparation guidance appears before submission. Address-change examples include synthetic utility bills or bank statements showing the requested new address and customer reference. Foreign-tax requests identify the jurisdiction/TIN evidence needed; contact updates explain OTP and independent phone verification; current-account requests explain source-of-funds information. These are prototype examples, not new bank policy: backend checks still decide whether the contents are sufficient.

Supporting PDFs can be selected, validated, previewed, replaced and removed during creation. The review step shows the selected files. The declaration and PDFs are sent together through the backend's existing extraction/validation/automation pipeline in one transactional submission. The UI distinguishes selected files, submission in progress and server-confirmed receipt. Uncertain submissions reuse the original idempotency key and payload.

The PDF-package workflow also retains its service, files and acknowledgement when going Back or changing the submission method. File preview/replace controls are shared with correction uploads.

My Requests and request details now expose **Cancel request**, using the server's `canCancel` and `cancellationReason` fields. A confirmation explains the consequences and cutoff. The owning customer can cancel an eligible pre-Operations request; stale confirmations and processed requests are rejected by the backend. Cancellation retains documents and audit history, closes outstanding work, and prevents further approval/processing. RM displays the request as closed. Existing approval controls, OneMap rules, Gemini configuration and database schema are preserved.

## Verification

- 22 backend customer/digital-form integration tests passed, including combined-document retries, cancellation ownership, stale revisions, Operations locking and terminal mutation guards.
- Seven portal unit tests passed, including retry boundaries and cancelled-request actions.
- Browser regression passed at 1440, 768 and 390 px: Back/Continue, browser history, navigation away/back, retained files, missing-document messages, previews, replacement, multipart submission, safe retry, cancellation focus/confirmation, server rejection and unavailable cancellation after processing.
- The RM browser regression passed with the new cancelled-case state.
- Portal and RM production builds passed.

The before screenshots are the original deployed portal; the after screenshots are the updated local frontend with intercepted synthetic API responses. Live release verification is reported separately after AWS/Vercel deployment.

| View | Before | After |
| --- | --- | --- |
| Desktop creation | [Original details](customer-flow/before-desktop.png) | [Documents before submission](customer-flow/documents-desktop.png) |
| Mobile creation | [Original details](customer-flow/before-mobile.png) | [Documents before submission](customer-flow/documents-mobile.png) |
| My Requests | No cancellation action | [Desktop](customer-flow/requests-desktop.png), [Mobile](customer-flow/requests-mobile.png) |

To repeat the intercepted browser regression, start the portal locally with its API origin set to the local `/api/customer` path, then run `node scripts/customer-flow-check.cjs`. No live customer requests are changed by that regression script.
