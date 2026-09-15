# Validation

- `node --check "Dashboard Meta Ads/campaign-manager-ui.js"` passed.
- `node --test tests/campaign-manager.test.cjs` passed: 20 tests.
- `PLAYWRIGHT_MODULE=... node tests/campaign-review-browser.cjs` passed. It covers the review hierarchy, desktop and 390 px widths, media replacement, error recovery, the publishing loader and reduced-motion mode.
- `node dev/build-pages.cjs` passed; 17 public artifacts were generated.
- GitHub Pages workflow `35000654287` completed successfully for commit `e0672ff`.
- Production returned HTTP 200 for the page, campaign module and stylesheet. The page and app reference the `20260915-campaign-review` cache version; the public module and stylesheet contain the review and stage-loader selectors.
