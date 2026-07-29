import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { ALLOWED_EMAILS } from '../lib/allowedEmails'
import logo from '../assets/cycle-it-logo-white.png'

export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined)
  const [error, setError] = useState('')
  const [denied, setDenied] = useState(false)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (u && !ALLOWED_EMAILS.includes(u.email)) {
          setDenied(true)
          signOut(auth)
          setUser(null)
          return
        }
        setDenied(false)
        setUser(u)
      }),
    [],
  )

  async function handleSignIn() {
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch {
      setError('Sign-in failed or was cancelled. Try again.')
    }
  }

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-4">
        <div className="w-full max-w-sm text-center">
          <img src={logo} alt="Cycle-It" className="mx-auto h-16 w-auto" />
          <h1 className="mt-6 text-xl font-semibold text-off-white">Fitter sign-in</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in with the Cycle-It Google account to view the client dashboard.
          </p>
          <button
            onClick={handleSignIn}
            className="mt-6 w-full rounded-lg bg-orange py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-orange-light"
          >
            Sign in with Google
          </button>
          {denied && (
            <p className="mt-3 text-sm text-orange">
              That Google account isn&apos;t authorized for the client dashboard.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-orange">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-3 border-b border-border bg-ink px-4 py-2 sm:px-6">
        <span className="text-xs text-muted">{user.email}</span>
        <button
          onClick={() => signOut(auth)}
          className="text-xs font-medium text-muted underline decoration-border underline-offset-4 hover:text-off-white"
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  )
}
