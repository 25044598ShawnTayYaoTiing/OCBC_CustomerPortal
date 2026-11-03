# AFI Banking Demo: business-banking redesign

## Public references inspected

The reference research used Google Chrome on publicly accessible pages and
OCBC-published interface screenshots. No authenticated bank session was opened.

- [OCBC Business Banking Singapore](https://www.ocbc.com/business-banking):
  white brand header with red accents, separate service navigation, clear neutral
  typography, restrained outlines and a responsive mobile navigation pattern.
- [OCBC Velocity document-submission guide](https://www.ocbc.com/business-banking/help-and-support/business-internet-banking/velocity-mailbox-submission):
  published screenshots show a horizontal service bar, contextual left navigation,
  compact mailbox tables, structured form fields, an attachment chooser and a
  clear final submission action.

The Velocity screenshots are public help references, not a claim about the
appearance of every current authenticated screen. Authenticated document tracking
was not available for inspection. AFI's tracking remains its own customer-facing
projection of the existing backend status and notification records.

## Implemented design direction

AFI retains its fictional name, original geometric monogram, original document
illustration, and an original sign-in composition. No OCBC logos, photographs,
proprietary graphics, bank login fields, fonts or screenshot files are served by
the portal. Reference captures are confined to ignored `.local/redesign/` for QA.

The shell uses a white global customer header, a blue active-state rail and a
document sidebar as its single primary navigation. A permanent visible demo
notice explains the synthetic-data scope and lack of affiliation with OCBC.

The overview is an operational workspace: actual counts, recorded statuses,
outstanding-request counts, a submission table and recent notifications.
It has no banking balances, payments, invented account features or fake
progress indicators.

The colour tokens in `src/afi-theme.css` are copied from the existing AFI Resolve
dashboard, with blue primary actions, white surfaces and a neutral canvas.
See [the exact palette and source](theme-palette.md). The banking layout in
`src/banking.css` retains square-edged panels, legible field labels and compact
striped tables. Green, amber, blue and red retain distinct status meanings.
Upload steps, file controls, correction dialogs and tracking panels use the same
spacing and control system. Mobile retains an accessible navigation drawer,
visible status cards, keyboard focus and reduced-motion support.

## Functional boundaries

This redesign changes only the customer frontend. Authentication, expiry,
ownership, idempotency keys, upload fingerprints, correction requests and real
status reads keep using the existing Spring Boot customer APIs. No backend or
internal staff-dashboard files were edited. Vercel settings and the public
`VITE_API_BASE_URL` contract remain unchanged.

The existing customer API still does not report live-AI provenance, expose earlier
PDF downloads, or support read/unread notification state. These capabilities are
not implied by the visual treatment.

## Verification

Use `npm test`, `npm run build`, and the documented real Chrome walkthrough in
the project README. The browser walkthrough includes the genuine intake,
lost-response recovery, replacement and Operations flow; it also compares the
existing backend source diff before and after. Screenshots and machine-readable
results are stored under ignored `.local/browser/`.

The redesign was verified on 3 November 2026: the TypeScript/Vite production build
and all three retry-safety tests passed. The real Chrome walkthrough reached
Operations for case `DOC-93b1160c-1ba0-426b-8e9f-19d7d6a515ed`, including a lost
response, refresh/sign-in and an idempotent retry. The same case was checked in
the staff dashboard. A final desktop/mobile review confirmed the new sign-in,
navigation and status cards with no horizontal viewport overflow. The existing
backend source comparison passed. Authentication, API-client, upload-intent and
backend-workflow code was preserved.

## Navigation cleanup

The sidebar owns the six main destinations on desktop and in the mobile drawer.
The duplicate horizontal service menu, overview tabs (including Action required),
document-service shortcut card and repeated attention banner were removed.
The attention metric and sidebar correction badge retain the real counts.
The header retains customer identity and the single global sign-out control;
duplicate notification/profile shortcuts and the profile-page sign-out were
consolidated. The sidebar help card no longer repeats the profile link.

Page-specific new-submission actions, recent-record links, View all links,
correction responses and document controls remain useful in context. Empty
states no longer add a second submission button beside the page's existing
action. Confirmation retains Track this submission; the sidebar provides history.
Duplicated no-request explanatory copy was also removed.

The production build and three existing tests passed. A focused Chrome check
covered desktop/mobile navigation, history search, application details,
correction links, selecting a real fixture PDF and reaching review, notifications,
profile, keyboard drawer dismissal and sign-out. No submissions were created.
