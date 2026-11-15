# DEV-38 home evidence

Captured 15 November 2026 from the production build at 390x844 and 1440x900, in English and French, dark and light, with reduced motion. Files ending in `full.png` show the entire page.

These are fixture captures. Transit is deliberately labelled as a demonstration; Vitreva uses the fixture placeholder. The untouched About block also reflects fixture media. These images do not establish a production deployment or current live Transit availability.

Verification: 507 passed / 78 existing project skips in the recovered affected browser run; its six service-title tap-target failures were fixed and all six then passed. Service layout and hover after the fix: 7 passed / 1 existing device skip. Card/rebuild checks before the fix: 53 passed / 9 existing device skips. Final focused unit checks: 71 passed. Svelte check: zero errors/warnings. Build, design lint and CSP checks (180 prerendered pages): pass.

The final change gives home service-title anchors a real 44px minimum height; their existing stretched card target and focus ring remain. The final browser verification used a dedicated preview server after an earlier attempt lost the reused server and returned connection errors.

Coordinator review and CI are still required. Shared CtaBand adds optional `leadingRule` and `bookingHref`; preserve these options when integrating sibling CTA changes. No sibling page files or package versions changed.

## CI repair after the initial PR run

Rebased the same branch onto origin/main at 9f8c1248 (merged Services and Contact). The CtaBand conflict preserves the Services `data-edge-rule` registration and the home `leadingRule` / `bookingHref` options. Default callers keep Contact/GitHub; home keeps project/booking. No sibling page source was edited for this repair.

All four reported tablet failures reproduced before the layout fix. Home cards now fill the slide width, and their media frame is capped at 16rem from tablet width so images cannot dominate the information below. Existing browser assertions remain unchanged.

Glance facts now use existing sanitizeTableCell plus htmlparser2 text extraction, replacing regex tag removal. A new test recorded the broken quoted-attribute/entity behavior before the fix; parser regressions also cover scripts, styles and malformed tags. This fixes text conversion. The server-only call path and escaped Svelte output do not establish an XSS sink. No dependency, override or CodeQL suppression was added; fresh CodeQL confirmation remains a CI responsibility.

Focused verification on the repaired production build: 12 card cases passed (phone, desktop, tablet; including the four reported failures); 8 CTA/divider integration cases passed (home, Services and case-study callers); 8 parser/CTA unit tests passed; type check had zero errors/warnings; build including SSR/page-contract/sitemap gates passed. One browser worker, unchanged assertions/timeouts, no added retries/skips. An intermediate run against the reusable preview endpoint disagreed with the inspected build, so final verification used a dedicated preview server on port 4408.

The eight screenshots above remain evidence from the initial implementation revision; this repair adds focused test proof rather than replacing them with claims about production.
