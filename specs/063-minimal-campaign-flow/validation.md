# Validation

- `PLAYWRIGHT_MODULE=... node tests/overview-routing-browser.cjs` passed, including the delayed planning request and visible Overview loader.
- `PLAYWRIGHT_MODULE=... node tests/campaign-review-browser.cjs` passed, including responsive scrolling and publication loading.
- Local preview at `http://localhost:8099/?view=overview` was approved for deployment.
- GitHub Pages workflow `35005649919` completed successfully for commit `22c1764`.
- Production references `20260915-minimal-campaign-flow`, includes the Overview loading panel, the versioned campaign module and the 760 px compact-dialog rule.
