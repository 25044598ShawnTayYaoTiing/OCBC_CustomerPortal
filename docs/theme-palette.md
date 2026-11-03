# Shared AFI Resolve palette

The authoritative source is the internal dashboard's
`../AFI_OCBC_IGNITE/frontend/src/design-system.css`, light `:root` block (lines
3–21). Its `main.tsx` loads this stylesheet after `styles.css`. Tailwind 4 is
enabled through the Vite plugin; there is no separate Tailwind colour config.

`src/afi-theme.css` copies these values locally, so the standalone portal's
Vercel build does not require the dashboard source tree.

| Role | Dashboard token | Exact value |
| --- | --- | --- |
| Primary actions, links, focus | `--blue` | `#3155bd` |
| Navy brand tone / headings | `--navy`, `--heading` | `#18283d` |
| Green accent | `--teal` | `#23765d` |
| Canvas | `--canvas` | `#f7f8fa` |
| Surface / secondary-button background | `--surface` | `#fff` |
| Subtle panels, table stripes | `--subtle` | `#f7f9fc` |
| Borders / secondary-button border | `--border` | `#e1e6ed` |
| Body / secondary-button text | `--text` | `#334155` |
| Muted text | `--muted` | `#647084` |
| Active / information background | `--active-bg` | `#edf2ff` |
| Success background / text | `--success-bg`, `--success-text` | `#edf7f1` / `#236647` |
| Warning background / text | `--warning-bg`, `--warning-text` | `#fff6e8` / `#875c16` |
| Danger background / text | `--danger-bg`, `--danger-text` | `#fbefef` / `#a13838` |

The same dashboard file supplies primary hover `#28489f` and input border
`#cbd4df` from its button and form rules. Secondary controls remain white with
body text and neutral borders, matching the dashboard's secondary-button role.

Operations / completed badges use success colours; correction, review and draft
use warning colours; pending validation uses information colours; failures use
danger colours. Labels and icons continue to convey status alongside colour.
The semantic text/background pairs and white primary-button text meet WCAG AA
normal-text contrast (4.5:1).

Verification: production build, the existing three retry-safety tests, and a
local Chrome smoke check comparing all 17 colour values directly against the
dashboard source. The check also compares pre-change desktop element geometry
and exercises sign-in, upload-step navigation, corrections, notifications and
mobile navigation with no horizontal overflow or browser exceptions. No new
submission is needed for this theme-only check. APIs and authentication logic
are unchanged.
