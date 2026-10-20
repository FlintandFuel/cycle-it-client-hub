import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFunctions } from 'firebase/functions'

// These are public client identifiers, not secrets — Firebase's security
// model relies on Firestore rules (see ../../firestore.rules), not on
// hiding this config. Safe to commit.
const firebaseConfig = {
  apiKey: 'AIzaSyBFl924xc4P9xfQKX-_b9pQTSe3mA6ZKO8',
  authDomain: 'cycle-it-client-hub.firebaseapp.com',
  projectId: 'cycle-it-client-hub',
  storageBucket: 'cycle-it-client-hub.firebasestorage.app',
  messagingSenderId: '89478750002',
  appId: '1:89478750002:web:a04273bbbe52902822012b',
}

// Tablets/phones: popup sign-in gets blocked or loses its result, and a
// redirect through the separate firebaseapp.com domain loses it too when the
// browser partitions third-party storage (the login button just bounces back
// to the sign-in screen). Serving the auth handler from the app's own host
// (Firebase Hosting serves /__/auth/* on every hosting domain) keeps the
// whole round trip first-party. Needs https://<host>/__/auth/handler in the
// OAuth client's authorized redirect URIs.
export const useRedirectSignIn =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent) &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)

const app = initializeApp(
  useRedirectSignIn ? { ...firebaseConfig, authDomain: window.location.host } : firebaseConfig,
)

// Persistent local cache: writes made with weak/no signal (mid fit,
// on-site at a client's house) queue in IndexedDB and sync automatically
// once connectivity returns — createProfile() resolves immediately from
// the local cache either way, so /new stays usable offline. Single-tab
// manager is fine here since the fitter dashboard is a one-tab-at-a-time,
// one-laptop workflow.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
})
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
// Region must match where functions/index.js deploys to (europe-west1,
// closest to South Africa) — calling the default us-central1 endpoint
// would just 404.
export const functions = getFunctions(app, 'europe-west1')
