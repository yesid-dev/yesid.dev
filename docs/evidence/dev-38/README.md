# DEV-38 home evidence

Captured 15 November 2026 from the production build at 390x844 and 1440x900, in English and French, dark and light, with reduced motion. Files ending in `full.png` show the entire page.

These are fixture captures. Transit is deliberately labelled as a demonstration; Vitreva uses the fixture placeholder. The untouched About block also reflects fixture media. These images do not establish a production deployment or current live Transit availability.

Verification: 507 passed / 78 existing project skips in the recovered affected browser run; its six service-title tap-target failures were fixed and all six then passed. Service layout and hover after the fix: 7 passed / 1 existing device skip. Card/rebuild checks before the fix: 53 passed / 9 existing device skips. Final focused unit checks: 71 passed. Svelte check: zero errors/warnings. Build, design lint and CSP checks (180 prerendered pages): pass.

The final change gives home service-title anchors a real 44px minimum height; their existing stretched card target and focus ring remain. The final browser verification used a dedicated preview server after an earlier attempt lost the reused server and returned connection errors.

Coordinator review and CI are still required. Shared CtaBand adds optional `leadingRule` and `bookingHref`; preserve these options when integrating sibling CTA changes. No sibling page files or package versions changed.
