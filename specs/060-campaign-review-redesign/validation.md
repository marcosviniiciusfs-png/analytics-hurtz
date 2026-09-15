# Validation

- `node --check "Dashboard Meta Ads/campaign-manager-ui.js"` passed.
- `node --test tests/campaign-manager.test.cjs` passed: 20 tests.
- `PLAYWRIGHT_MODULE=... node tests/campaign-review-browser.cjs` passed. It covers the review hierarchy, desktop and 390 px widths, media replacement, error recovery, the publishing loader and reduced-motion mode.
- `node dev/build-pages.cjs` passed; 17 public artifacts were generated.
- Production verification will be added after the GitHub Pages deployment completes.
