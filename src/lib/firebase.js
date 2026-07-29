import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
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

export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
