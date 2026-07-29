// Placeholder for the Cloud Functions that ship in later phases:
//
// Phase 2  — onCreate(profiles/{id}) trigger that sends the "here's your
//            fit profile" email via the Gmail API, plus an HTTPS endpoint
//            for the review "don't ask me again" opt-out link.
// Phase 2b — review opt-out endpoint (sets review.optedOut = true).
// Phase 3  — a scheduled function (Cloud Scheduler, daily ~8am SAST) that
//            emails clients whose fitDate was 89-92 days ago and whose
//            followUp.sent is still false.
//
// Gmail API auth will be OAuth against Ruan's Google Workspace account —
// credentials supplied by the project owner as environment config, not
// checked into source. See ../README.md for the current build phase.
