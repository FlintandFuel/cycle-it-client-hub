// Mirrors the allowlist in firestore.rules (`allow list`) — keep both in
// sync. Used client-side to gate the /clients dashboard and to decide
// whether to show fitter-only chrome (e.g. the "back to clients" link on
// the otherwise-public client profile page).
export const ALLOWED_EMAILS = ['ruan.photos26@gmail.com', 'cvaniek@gmail.com', 'cycle.itt@gmail.com']
