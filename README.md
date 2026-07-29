# Cycle-It — Bike Fit Dashboard

Replaces Ruan Smit's Excel/Dropbox/email workflow with a live client fit
profile app. See `bike-fit-dashboard-claude-code-prompt.md` for the full
build brief.

Firebase project: `cycle-it-client-hub` (project number `89478750002`,
set in `.firebaserc`). Firestore rules are deployed and live.

## Status

**Phase 1 — dashboard. Live, running against real Firestore.**

- **`/new`** — fitter view. Capture bike details, measurements, cleat fit
  and notes, then hand the client-details section off for name/email/phone
  and consent. Saving generates a shareable `/p/:id` profile link. No
  sign-in required (matches the "standing next to a bike" use case).
- **`/p/:id`** — read-only, mobile-first client profile page. Public by
  design — the ID is the access control, like an unlisted link.
- **`/clients`** — dashboard listing every saved profile (name, bike, fit
  date, status badges), with a link into each `/p/:id`. Gated behind
  Google sign-in (see below).

Three fictional demo clients are seeded in Firestore — see "Demo data"
below.

**Phase 2 — automated email (code written, not deployed).** `functions/`
has an `onProfileCreated` Firestore trigger that emails the client their
profile link plus a review ask via the Gmail API, and a `reviewOptOut`
HTTPS endpoint for the "Don't ask me again" link (Phase 2b). Not live
yet — needs Gmail OAuth credentials and a `firebase deploy` of the
functions (see below).

## Run it locally

```
npm install
npm run dev
```

Writes/reads go straight to the real `cycle-it-client-hub` Firestore —
there's no local emulator or mock layer anymore.

## Auth

`/clients` is wrapped in `src/components/AuthGate.jsx`, which requires a
Google sign-in (Firebase Auth, Google provider — already enabled on the
Firebase project). `firestore.rules` enforces this server-side too:
listing the `profiles` collection requires `request.auth != null`;
reading a single profile by ID doesn't (needed for the public `/p/:id`
email links). Sign in with whichever Google account should have access —
Firebase Auth doesn't restrict by domain out of the box, so if you want
to lock this to specific people, that's a follow-up (e.g. an allowlist
check in `AuthGate`).

## Demo data

```
npm run seed:demo
```

Pushes three fictional clients (`src/lib/demoData.js`) into Firestore —
safe to re-run, it skips any that already exist. Gives `/clients` and
`/p/:id` something realistic to show without needing real client data.

## Data layer

`src/lib/profileStore.js` (`getProfile`, `createProfile`, `listProfiles`)
is the only thing that talks to Firestore — `src/lib/firebase.js` holds
the app config (not a secret; Firebase's security model is enforced by
`firestore.rules`, not by hiding these values).

## What's needed for Phase 2 email to go live

1. **Gmail OAuth credentials.** `functions/.env.example` lists what's
   needed (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`,
   `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL`) — from a Google Cloud
   OAuth client authorized against Ruan's Workspace mailbox with the
   `gmail.send` scope. Copy the file to `functions/.env` and fill it in
   (git-ignored).
2. **Deploy functions + hosting:**
   ```
   firebase deploy
   ```
   (Firestore rules are already deployed separately via
   `firebase deploy --only firestore:rules` — full `deploy` also pushes
   Hosting and Functions.)

## Next phases

- **Phase 2 / 2b** — done in code (`functions/index.js`,
  `functions/lib/`), pending the Gmail credentials + deploy above.
- **Phase 3** — scheduled 3-month follow-up email. Not built yet.
  `functions/lib/templates.js` already has `buildFollowUpEmail` ready to
  reuse; `CALENDLY_URL` is set in `.env.example`
  (`https://calendly.com/ruan-photos26/`).
- **Phase 4** — WhatsApp nudge button (`wa.me` link) on the fitter
  dashboard after save. Not built yet.
