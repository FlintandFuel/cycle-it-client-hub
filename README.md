# Cycle-It — Bike Fit Dashboard

Replaces Ruan Smit's Excel/Dropbox/email workflow with a live client fit
profile app. See `bike-fit-dashboard-claude-code-prompt.md` for the full
build brief.

Firebase project: `cycle-it-client-hub` (project number `89478750002`,
already set in `.firebaserc`).

## Status: Phase 1 built, Phase 2 code ready but not deployed

**Phase 1 — dashboard.** Two views, running against local mock data:

- **`/new`** — fitter view. Capture bike details, measurements, cleat fit
  and notes, then hand the client-details section off for name/email/phone
  and consent. Saving generates a shareable `/p/:id` profile link.
- **`/p/:id`** — read-only, mobile-first client profile page.

A demo profile is seeded automatically on first load (fictional client,
realistic measurement values) — open `/p/demo-jordan-pillay` to see it
immediately.

**Phase 2 — automated email (code written, not live yet).** `functions/`
has an `onProfileCreated` Firestore trigger that emails the client their
profile link plus a review ask via the Gmail API, and a `reviewOptOut`
HTTPS endpoint for the "Don't ask me again" link (Phase 2b). See
"What's needed to go live" below — this can't actually fire until two
things happen.

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

## What's needed to go live

1. **Frontend → real Firestore.** The app still writes to `localStorage`
   (see above), so `onProfileCreated` never fires yet — Firestore
   `onCreate` only triggers on real writes. Wiring the frontend to
   Firestore needs the Web App config object (`apiKey`, `authDomain`,
   `appId`, etc.) from Firebase Console → Project settings → your web app.
2. **Gmail OAuth credentials.** `functions/.env.example` lists what's
   needed (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`,
   `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL`) — these come from a Google
   Cloud OAuth client authorized against Ruan's Workspace mailbox with the
   `gmail.send` scope. Copy the file to `functions/.env` and fill it in
   (git-ignored).

Once both are in place:

```
firebase login
firebase deploy
```

## Next phases

- **Phase 2 / 2b** — done in code (`functions/index.js`,
  `functions/lib/`), pending the two prerequisites above.
- **Phase 3** — scheduled 3-month follow-up email. Not built yet.
  `functions/lib/templates.js` already has `buildFollowUpEmail` ready to
  reuse; `CALENDLY_URL` is set in `.env.example`
  (`https://calendly.com/ruan-photos26/`).
- **Phase 4** — WhatsApp nudge button (`wa.me` link) on the fitter
  dashboard after save. Not built yet.
