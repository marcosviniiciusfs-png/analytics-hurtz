# Tasks: Campaign entry on Overview

## Setup and foundation
- [x] T001 Install official Spec Kit and record specification/design in specs/059-overview-campaign-entry/.
- [x] T002 Preserve BM identity in Dashboard Meta Ads/app.js catalog mapping.

## US1 - Describe a campaign
Independent test: one labelled field, validation, responsive layout, no metric requests.
- [x] T003 [US1] Add browser acceptance scenarios in tests/overview-campaign-browser.cjs.
- [x] T004 [US1] Implement description entry (trimmed length 12 to 1500 characters) in Dashboard Meta Ads/overview-campaign.js.
- [x] T005 [US1] Integrate overview routing and lazy monitoring in Dashboard Meta Ads/app.js and responsive styling in Dashboard Meta Ads/brand-overrides.css.

## US2 - Choose a destination
Independent test: zero, sole, multiple and missing-BM destinations; retry and stale responses.
- [x] T006 [US2] Add catalog selection, deduplication and automatic sole destination in Dashboard Meta Ads/overview-campaign.js.

## US3 - Review destination
Independent test: BM/account identity matches plan destination in initial and edited review; no automatic publication.
- [x] T007 [US3] Expose authorized draft preparation and destination snapshot in Dashboard Meta Ads/campaign-manager-ui.js.
- [x] T008 [US3] Validate existing editor/upload/confirmation regression in tests/campaign-review-browser.cjs.

## Polish and delivery
- [x] T009 Include assets/cache versions in dev/build-pages.cjs and Dashboard Meta Ads/index.html; run build and scoped checks.
- [ ] T010 Record results in specs/059-overview-campaign-entry/validation.md and verify production deployment.

## Dependencies and strategy
T001 -> T002 -> T003 -> T004/T006 -> T005/T007 -> T008 -> T009 -> T010.
Deliver all three stories together. US1 entry is the initial increment; US2 and US3 complete the user journey. Shared files require sequential edits. Independent research of startup query triggers ran alongside local editor research; no parallel implementation needed.
