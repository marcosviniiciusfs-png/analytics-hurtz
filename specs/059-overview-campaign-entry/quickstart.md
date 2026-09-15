# Validation

Run node --check on app.js and the two UI modules. Run node --test tests/campaign-manager.test.cjs and the overview browser test with PLAYWRIGHT_MODULE pointing to the installed Playwright package. Run node dev/build-pages.cjs.
Browser scenarios: empty brief; delayed catalog; one known BM/account; one BM/multiple accounts; multiple BMs; duplicate IDs; missing BM; no accounts; planning failure/retry; stale response after navigation; escaped account labels; review identity; mobile 320/390 and desktop. Requests are mocked; assert no automatic create/upload calls.
Run existing campaign-review-browser.cjs to verify editing, upload retry and confirmation regression with mocks.
