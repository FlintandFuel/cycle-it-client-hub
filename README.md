# Cycle-It — Bike Fit Dashboard

Replaces Ruan Smit's Excel/Dropbox/email workflow with a live client fit
profile app. See `bike-fit-dashboard-claude-code-prompt.md` for the full
build brief.

Firebase project: `cycle-it-client-hub` (project number `89478750002`,
set in `.firebaserc`). Firestore rules and indexes are deployed and live.

## Status

**Phase 1 — dashboard. Live, running against real Firestore.**

- **`/new`** — fitter view. Capture bike details, measurements, cleat fit
  and notes, then hand the client-details section off for name/email/phone
  and consent. Saving generates a shareable `/p/:id` profile link, plus a
  **WhatsApp nudge button** (Phase 4 — done, no credentials needed, just a
  `wa.me` link). No sign-in required (matches the "standing next to a
  bike" use case).
- **`/p/:id`** — read-only, mobile-first client profile page. Public by
  design — the ID is the access control, like an unlisted link. If opened
  by a signed-in fitter (e.g. from the dashboard), it shows an extra
  "← All clients" link back to `/clients`; clients themselves never see it.
  The measurements section includes a numbered bike-fit diagram
  (`src/components/FitDiagram.jsx`, hand-drawn SVG) — each measurement row
  is numbered 1-7 to match the callout on the diagram.
- **`/clients`** — dashboard listing every saved profile (name, bike, fit
  date, status badges), with a link into each `/p/:id`. Gated behind
  Google sign-in, allowlisted to specific accounts (see "Auth"). If
  there are recent Calendly bookings (see below), a signed-in fitter also
  sees a "Recent bookings" picker at the top of `/new` to prefill client
  details instead of asking again.
- **`/booked`** — landing page for Calendly's booking-confirmation
  redirect; not meant to be visited directly (see "Calendly integration").

Three fictional demo clients are seeded in Firestore — see "Demo data"
below.

**Works offline.** `/new` uses Firestore's persistent local cache
(`src/lib/firebase.js`), so a save on weak/no signal — the "on-site fit"
case — completes instantly from the local cache and syncs automatically
once back in range. The header shows an Online/Offline badge, and the
success screen flags it if a save happened offline.

**Phase 2 / 2b / 3 — automated email (code written, not deployed).**
`functions/` has:
- `onProfileCreated` — Firestore trigger, emails the client their profile
  link plus a review ask via the Gmail API (Phase 2).
- `reviewOptOut` — HTTPS endpoint for the "Don't ask me again" link
  (Phase 2b).
- `sendFollowUpReminders` — scheduled job (8am SAST daily) that emails
  clients 89-92 days after their fit date with a Calendly booking link
  (Phase 3).

None of these are live yet — needs Gmail OAuth credentials and a
`firebase deploy` of the functions (see below).

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
Firebase project), restricted to the allowlist in
`src/lib/allowedEmails.js`:

- `ruan.photos26@gmail.com`
- `cvaniek@gmail.com`

`firestore.rules` enforces the same allowlist server-side (checks
`request.auth.token.email`) — listing the `profiles` collection is
rejected for anyone else, even if they sign in. Reading a single profile
by ID doesn't require auth at all (needed for the public `/p/:id` email
links). Keep `allowedEmails.js` and `firestore.rules` in sync if the
allowlist changes.

## Demo data

```
npm run seed:demo
```

Pushes three fictional clients (`src/lib/demoData.js`) into Firestore —
safe to re-run, it skips any that already exist. Gives `/clients` and
`/p/:id` something realistic to show without needing real client data.

## Calendly integration

When someone books through Calendly, their name/email/phone gets captured
automatically so Ruan doesn't have to ask again on the day — no Calendly
API key or webhook needed, just one redirect URL configured in Calendly's
UI:

1. In Calendly, open the bike-fit event type → **Confirmation Page** (or
   **"Advanced" / "After confirmation"**, depending on Calendly's current
   UI) → choose **"Redirect to an external site"**.
2. Set the redirect URL to the plain page, no query params or merge tags:
   ```
   https://cycle-it-client-hub.web.app/booked
   ```
   (Typing merge tags like `[invitee_full_name]` directly into this field
   gets rejected as "not a valid url" — brackets aren't valid raw URL
   characters. Don't type them here.)
3. Enable the separate **"Pass event details to your redirected page"**
   toggle. Calendly then appends its own fixed query params on redirect —
   `invitee_full_name`, `invitee_email`, `event_start_time`, and
   `answer_1`–`answer_10` for custom questions — which is what
   `BookedConfirmation.jsx` reads. Phone isn't collected yet (Calendly's
   default form doesn't ask for it); if a custom "phone number" question
   is added to the event later, wire its `answer_N` param into
   `BookedConfirmation.jsx`.
4. That's it — no webhook, no API token. The client's browser lands on
   `/booked`, which writes their details to Firestore (`bookings`
   collection) and shows a friendly "you're all set" page instead of
   raw query params.

On the day, a signed-in fitter opens `/new` and sees a "Recent bookings"
row (last 20) to tap instead of retyping. Reading that list requires the
same allowlisted sign-in as `/clients` (`firestore.rules`) — an
unauthenticated visitor to `/new` never sees or can query it, so this
doesn't add a new place client PII leaks.

If Calendly can't pass phone via a merge tag on your plan, this still
saves re-typing name + email, which is most of the repetition.

## Data layer

`src/lib/profileStore.js` (`getProfile`, `createProfile`, `listProfiles`)
is the only thing that talks to Firestore — `src/lib/firebase.js` holds
the app config (not a secret; Firebase's security model is enforced by
`firestore.rules`, not by hiding these values).

## What's needed for Phase 2/3 email to go live

1. **Gmail OAuth credentials.** `functions/.env.example` lists what's
   needed (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`,
   `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL`) — from a Google Cloud
   OAuth client authorized against Ruan's mailbox with the `gmail.send`
   scope. Copy the file to `functions/.env` and fill it in (git-ignored).

   Quick path to get these:
   1. In [Google Cloud Console](https://console.cloud.google.com), select
      the `cycle-it-client-hub` project (same project as Firebase).
   2. **APIs & Services → Library** — enable the **Gmail API**.
   3. **APIs & Services → OAuth consent screen** — set it up (External is
      fine; add Ruan's Gmail as a test user if the app stays unverified,
      which is fine for this single-account use case).
   4. **APIs & Services → Credentials → Create Credentials → OAuth client
      ID**, type **Desktop app**. This gives you `GMAIL_CLIENT_ID` and
      `GMAIL_CLIENT_SECRET`.
   5. Get a refresh token for the `https://www.googleapis.com/auth/gmail.send`
      scope, authorized as Ruan's Gmail account — easiest way is
      [Google's OAuth 2.0 Playground](https://developers.google.com/oauthplayground):
      gear icon → "Use your own OAuth credentials" → paste the client
      ID/secret → select the Gmail send scope → authorize as Ruan →
      exchange for tokens → copy the refresh token.
   6. `GMAIL_SENDER_EMAIL` is just Ruan's Gmail address.
2. **Deploy functions + hosting:**
   ```
   firebase deploy
   ```
   (Firestore rules/indexes are already deployed separately — full
   `deploy` also pushes Hosting and Functions.)

## Next phases

- **Phase 2 / 2b / 3** — done in code (`functions/index.js`,
  `functions/lib/`), pending the Gmail credentials + deploy above.
- **Phase 4** — done (WhatsApp nudge button on the fitter success screen,
  no credentials needed).
