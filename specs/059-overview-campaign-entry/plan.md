# Implementation Plan: Campaign entry on Overview

**Branch**: main | **Date**: 2026-09-15 | **Spec**: [spec.md](spec.md)

## Summary
Replace overview metrics with a description-first campaign composer. Reuse the existing campaign planner/editor and server authorization. Preserve business metadata in the authorized catalog and show destination in review.

## Technical Context
- Language: native browser JavaScript, HTML and CSS; Node.js backend unchanged.
- Dependencies: existing campaign-manager-ui module; Playwright for browser validation.
- Storage: in-memory description and selected destination; existing authenticated catalog.
- Platform: responsive web, minimum viewport 320px.
- Performance: zero automatic spend/history requests from overview; plan only after explicit continuation.
- Scope: overview, catalog identity mapping, campaign review, public asset build.

## Constitution Check
No project constitution exists. Apply existing authorization boundaries, preserve unrelated user edits, no real ad publication in tests, scoped deployment. Pre-design and post-design checks pass.

## Project Structure
- Dashboard Meta Ads/overview-campaign.js: composer, account selection and preparation states.
- Dashboard Meta Ads/app.js: routing, account identity preservation and lazy monitoring.
- Dashboard Meta Ads/campaign-manager-ui.js: reusable prepare entry and destination review.
- Dashboard Meta Ads/brand-overrides.css: overview layout.
- Dashboard Meta Ads/index.html and dev/build-pages.cjs: public assets/cache versions.
- tests/overview-campaign-browser.cjs: browser acceptance scenarios.

## Design
Use a dedicated composer module with injected catalog, connection and preparation callbacks. Use one account selector grouped by BM so one BM with multiple accounts is unambiguous. Keep editor dialogs in document.body to permit overview review independently of the account workspace. Keep selected account snapshot per prepared draft and server-authorized account query parameter. Sequence cancellation ignores stale results. Existing account manager functionality remains intact.
