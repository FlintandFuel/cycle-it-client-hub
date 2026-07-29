# Build brief: bike fit client dashboard (Cycle-It)

Paste this whole document into Claude Code as your first message in a new project folder. It's written as one continuous brief — work through the phases in order, checking in after each one before moving to the next.

## Context

I'm building this as a flagship demo for my dev studio (Flint and Fuel Creative) — it needs to look genuinely polished, not like an internal tool. It's a real project for a bike-fitting client (Cycle-It, run by Ruan Smit) but I also want to be able to show it off as a portfolio piece.

Current process it replaces: Ruan captures rider measurements in an Excel sheet during a fit session, saves it to Dropbox, and manually emails it to clients when they ask. We're replacing that with a live web app.

## What we're building, in one sentence

A black-and-orange web app where Ruan captures a rider's bike-fit measurements on his laptop during the session, the client fills in their own contact details on the same screen, and on save the system generates a shareable client profile page, auto-emails it to them with a review request, and follows up 3 months later about rebooking.

## Tech stack (use this, don't substitute)

- Frontend: React + Vite
- Hosting: Firebase Hosting
- Database: Firebase Firestore
- Backend logic: Firebase Cloud Functions (Node.js)
- Email sending: Gmail API via a Cloud Function (OAuth against a Google Workspace/Gmail account) — plan for this from Phase 1 even though it's wired up in Phase 2
- Scheduled jobs: Firebase Cloud Scheduler + Cloud Functions
- Styling: plain CSS or Tailwind, your call — no heavy component libraries

## Design system

- Background: near-black (`#0B0B0C` or similar), not pure `#000`
- Accent: orange (`#E8672B`–`#F2A23A` range — pick one primary and one lighter hover/highlight shade)
- Text: off-white primary, muted gray secondary
- Typography: clean, confident sans-serif (system font stack is fine), bold short headlines, generous whitespace
- Tone reference: cycleit.co.za — bold single-CTA sections, no clutter, short punchy copy, one accent color used sparingly and deliberately (not everywhere)
- Rounded corners on cards (8–12px), thin borders, no gradients/shadows/glow — flat and clean
- Fully responsive, but the fitter dashboard's primary use case is a laptop screen; the client profile page's primary use case is a phone screen (opened from an email link)

## Data model (Firestore)

Collection: `profiles`, one document per client, random auto-ID (not sequential/guessable).

```
{
  id: string (auto),
  createdAt: timestamp,
  fitDate: date,
  fitSpecialist: string,           // default "Ruan Smit"

  client: {
    name: string,
    email: string,
    phone: string,
    consentGiven: boolean          // POPIA-style consent checkbox, required before save
  },

  bike: {
    make: string,
    model: string,
    size: string
  },

  measurements: {
    saddleHeight: string,          // e.g. "730mm"
    reach: string,                 // saddle to handlebar
    saddleSetback: string,
    stemLength: string,
    saddleToBarDrop: string,
    handlebarWidth: string,
    crankLength: string
  },

  cleatFit: {
    sitBoneWidth: string,
    kneeAngle: string,
    cleatPosition: string
  },

  notes: string,                   // free text, default to the standard torque/fitment note

  emailStatus: {
    profileEmailSent: boolean,
    profileEmailSentAt: timestamp | null
  },

  review: {
    optedOut: boolean,             // default false
    clicked: boolean                // did they click the review link (best-effort tracking)
  },

  followUp: {
    sent: boolean,                 // default false
    sentAt: timestamp | null
  }
}
```

## Phase 1 — Dashboard (build this first, this is the demo-ready milestone)

Two views in one app:

**Fitter view** (`/new`)
- A form matching the data model above, fields ordered top-to-bottom exactly as Ruan currently fills them on paper/Excel: bike details → measurements → cleat fit → notes.
- Large, legible inputs — this gets filled in mid-session, standing next to a bike, not sitting comfortably at a desk.
- Notes field pre-filled with a default fitment/torque disclaimer, editable.
- A "Client details" section at the bottom that the fitter hands off — name, email, phone, and a consent checkbox — styled as clearly client-facing (maybe a subtle visual separator, like "hand this screen to your client").
- A "Save & generate profile" button. On click: validate required fields, write to Firestore, generate the client profile URL, and show it on screen (with a copy-link button) — don't wire up email sending yet, that's Phase 2.

**Client profile view** (`/p/:id`)
- Read-only, mobile-first, black/orange styled page rendering everything in the profile nicely — not a spreadsheet dump. Think: a clean summary card (bike + fit date), then a measurements table, then the notes.
- No edit controls, no navigation chrome — this is a page someone opens once from an email link on their phone.

Seed the Firestore emulator (or local mock data) with one realistic demo profile so the app has something to show immediately — use fictional client details (not a real client's name/contact info), but keep the actual measurement values realistic (e.g. saddle height 730mm, reach 505mm, setback 48mm, stem 100mm, drop 25mm, handlebar 420mm, crank 175mm, sit-bone width 120mm, knee angle 40°, cleat position 190mm) since those reflect genuine fit-chart numbers.

Stop here and show me a working local build before moving on.

## Phase 2 — Automated email

- On successful save in `/new` (or on a Firestore `onCreate` trigger — your call which is cleaner), fire a Cloud Function that sends an email via the Gmail API from Ruan's account.
- Email content: short friendly note, "here's your fit profile" with the `/p/:id` link, then a clearly separated review section (see Phase 2b).
- Mark `emailStatus.profileEmailSent = true` and timestamp it after a successful send. Don't resend on duplicate triggers.
- Leave Gmail OAuth credentials as environment variables / placeholders — I'll supply the actual Google Cloud project credentials myself.

### Phase 2b — Review ask with opt-out

- Include a "Leave us a review" button in the email linking to Ruan's Google review shortcut: `https://g.page/r/CYrj4CFQ_xiSEB0/review`
- Directly below it, a plain-text link: "Don't ask me again" — this hits a small Cloud Function endpoint that sets `review.optedOut = true` on that client's document, then shows a simple "Got it, we won't ask again" confirmation page.
- Before sending any future email to a client (including the Phase 3 follow-up), check `review.optedOut` isn't required for that check — opt-out only ever suppresses the review ask, not the follow-up reminder itself. Keep those two independent.

## Phase 3 — 3-month follow-up reminder

- A scheduled Cloud Function (Cloud Scheduler — run it once daily, e.g. 8am SAST) queries Firestore for profiles where `fitDate` is ~3 months ago (build a reasonable window, e.g. between 89 and 92 days, so the daily job doesn't miss anyone) and `followUp.sent` is false.
- Sends a short, warm email: how's the fit feeling, want a quick follow-up tune-up, with a Calendly booking link (placeholder URL for now — I'll supply the real one).
- Mark `followUp.sent = true` and timestamp after sending, so it never fires twice for the same client.

## Phase 4 — Optional WhatsApp nudge

- On the fitter dashboard, after a successful save, show a "Send WhatsApp nudge" button that opens a pre-filled `wa.me` link (using the client's phone number) with a short "your fit is done, check your email" message — this opens WhatsApp with the message pre-typed, Ruan just hits send. No API integration needed for this, it's a zero-cost manual-tap flow.

## A few things to keep in mind throughout

- This is health/body-measurement-adjacent data — don't make client profile URLs guessable, and treat the consent checkbox as a hard requirement before any record saves.
- Keep the whole thing deployable as a single Firebase project (Hosting + Functions + Firestore) so it's simple to hand over or host under a subdomain later (e.g. `fit.cycleit.co.za`).
- Prioritize Phase 1 looking genuinely great — that's the piece that gets shown as the "sales" demo, so the visual polish matters more there than anywhere else in the build.

Start with Phase 1. Ask me anything you need clarified before you start, otherwise go ahead and scaffold the project.
