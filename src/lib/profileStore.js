// Mock data layer for Phase 1, shaped to match the Firestore `profiles`
// collection defined in the build brief. Swapping this for real Firestore
// calls in a later phase should only require rewriting the bodies of the
// functions below (getProfile / createProfile) — callers stay the same.

import { demoProfile, DEMO_PROFILE_ID } from './demoData'

const STORAGE_KEY = 'cycleit_profiles_v1'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeAll(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

function ensureSeeded() {
  const profiles = readAll()
  if (!profiles[DEMO_PROFILE_ID]) {
    profiles[DEMO_PROFILE_ID] = demoProfile
    writeAll(profiles)
  }
}

ensureSeeded()

// Random, non-sequential, non-guessable ID — mirrors an auto-generated
// Firestore document ID closely enough for local/demo purposes.
function generateId() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function getProfile(id) {
  const profiles = readAll()
  return profiles[id] ?? null
}

export async function createProfile(data) {
  const id = generateId()
  const profile = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    emailStatus: { profileEmailSent: false, profileEmailSentAt: null },
    review: { optedOut: false, clicked: false },
    followUp: { sent: false, sentAt: null },
  }
  const profiles = readAll()
  profiles[id] = profile
  writeAll(profiles)
  return profile
}
