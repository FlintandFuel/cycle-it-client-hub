import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

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

const app = initializeApp(firebaseConfig)

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
