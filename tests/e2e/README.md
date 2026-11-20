# End-to-end tests
```powershell
npx playwright install chromium     # one-time download
npm run test:e2e
```
`public.spec.ts` needs no login. Logged-in role flows (seller -> admin approval -> enquiry -> affiliate click -> webhook ->
commission -> payout) need real test accounts, so they are in `docs/MANUAL_TEST_PLAN.md` until you create those users.
