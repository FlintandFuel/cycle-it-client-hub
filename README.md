# Cycle-It — Bike Fit Dashboard

Replaces Ruan Smit's Excel/Dropbox/email workflow with a live client fit
profile app. See `bike-fit-dashboard-claude-code-prompt.md` for the full
build brief.

## Status: Phase 1 (dashboard)

Two views, running against local mock data (no Firebase project wired up
yet):

- **`/new`** — fitter view. Capture bike details, measurements, cleat fit
  and notes, then hand the client-details section off for name/email/phone
  and consent. Saving generates a shareable `/p/:id` profile link.
- **`/p/:id`** — read-only, mobile-first client profile page.

A demo profile is seeded automatically on first load (fictional client,
realistic measurement values) — open `/p/demo-jordan-pillay` to see it
immediately.

## Run it locally

```
npm install
npm run dev
```

## Data layer

`src/lib/profileStore.js` is shaped exactly like the Firestore `profiles`
collection described in the brief, but persists to `localStorage` for now.
Swapping in real Firestore later should only mean rewriting the bodies of
`getProfile` / `createProfile` — every caller stays the same.

## Firebase scaffold

`firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.firebaserc`
and `functions/` are scaffolded so the project is deploy-ready once real
Firebase wiring happens (Phase 2+):

1. `firebase login`
2. Create a Firebase project, then set its ID in `.firebaserc`
   (currently a placeholder: `cycle-it-fit-dashboard`)
3. `firebase deploy`

Gmail API OAuth credentials (Phase 2) and the Calendly booking link
(Phase 3) are left as placeholders — the project owner supplies the real
values.

## Next phases (not yet built)

- **Phase 2** — Cloud Function sends the profile email via Gmail API on
  save.
- **Phase 2b** — review-ask email section with opt-out link.
- **Phase 3** — scheduled 3-month follow-up email.
- **Phase 4** — WhatsApp nudge button (`wa.me` link) on the fitter
  dashboard after save.
