// No real clientId exists in the data model (see build brief) — each
// fit session is an independent `profiles` document. This groups sessions
// into per-client history by matching on normalized email OR phone,
// whichever is shared, since a returning client may give a different
// email the second time but keeps the same number (or vice versa). Both
// fields are already required on every session, so this needs no new
// data and no change to how fitters fill in the form.
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase()
}

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '')
}

// latestProfile drives the dashboard's bike / last-fit columns and profile
// link, so a real fit always wins over a later component-only purchase.
function isNewerLatest(profile, current) {
  if (!current) return true
  const isFit = profile.kind !== 'components'
  const currentIsFit = current.kind !== 'components'
  if (isFit !== currentIsFit) return isFit
  return (profile.fitDate || '') > (current.fitDate || '')
}

export function groupProfilesByClient(profiles) {
  const groups = []

  for (const profile of profiles) {
    const email = normalizeEmail(profile.client?.email)
    const phone = normalizePhone(profile.client?.phone)
    const existing = groups.find((g) => (email && g.email === email) || (phone && g.phone === phone))

    if (existing) {
      existing.profiles.push(profile)
      if (email && !existing.email) existing.email = email
      if (phone && !existing.phone) existing.phone = phone
      if (isNewerLatest(profile, existing.latestProfile)) existing.latestProfile = profile
    } else {
      groups.push({ email, phone, profiles: [profile], latestProfile: profile })
    }
  }

  for (const g of groups) {
    g.profiles.sort((a, b) => (b.fitDate || '').localeCompare(a.fitDate || ''))
  }
  groups.sort((a, b) => (b.latestProfile.fitDate || '').localeCompare(a.latestProfile.fitDate || ''))

  return groups
}

export function findClientGroup(groups, profileId) {
  return groups.find((g) => g.profiles.some((p) => p.id === profileId))
}
