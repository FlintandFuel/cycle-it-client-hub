// Fictional demo clients, realistic fit-chart measurement values. Seeded
// into real Firestore via `npm run seed:demo` (scripts/seed-demo.mjs) so
// the dashboard and /p/:id links always have something to show.
export const DEMO_PROFILE_ID = 'demo-jordan-pillay'

export const demoProfile = {
  id: DEMO_PROFILE_ID,
  createdAt: '2026-04-22T09:14:00.000Z',
  fitDate: '2026-04-22',
  fitSpecialist: 'Ruan Smit',

  client: {
    name: 'Jordan Pillay',
    email: 'jordan.pillay@example.com',
    phone: '+27 82 555 0134',
    consentGiven: true,
  },

  bike: {
    make: 'Cervelo',
    model: 'Caledonia-5',
    size: '54cm',
  },

  measurements: {
    saddleHeight: '730mm',
    reach: '505mm',
    saddleSetback: '48mm',
    stemLength: '100mm',
    saddleToBarDrop: '25mm',
    handlebarWidth: '420mm',
    crankLength: '175mm',
  },

  measurementRecommendations: {
    saddleHeight: '',
    reach: '',
    saddleSetback: '',
    stemLength: 'Consider a shorter stem if reach still feels long after settling in',
    saddleToBarDrop: '',
    handlebarWidth: '',
    crankLength: '',
  },

  cleatFit: {
    sitBoneWidth: '120mm',
    kneeAngle: '40°',
    cleatPosition: { left: '190mm', right: '188mm' },
  },

  notes:
    'All bolts torqued to manufacturer spec and checked with a torque wrench. Please re-check saddle and stem bolts after your first two rides as cables and components settle. Contact us if you feel any discomfort after your first few sessions.',

  emailStatus: {
    profileEmailSent: true,
    profileEmailSentAt: '2026-04-22T09:20:00.000Z',
  },

  review: {
    optedOut: false,
    clicked: false,
  },

  followUp: {
    sent: false,
    sentAt: null,
  },
}

const demoClientB = {
  id: 'demo-sarah-naidoo',
  createdAt: '2026-07-15T10:02:00.000Z',
  fitDate: '2026-07-15',
  fitSpecialist: 'Ruan Smit',

  client: {
    name: 'Sarah Naidoo',
    email: 'sarah.naidoo@example.com',
    phone: '+27 83 555 0198',
    consentGiven: true,
  },

  bike: { make: 'Specialized', model: 'Tarmac SL7', size: '52cm' },

  measurements: {
    saddleHeight: '695mm',
    reach: '480mm',
    saddleSetback: '42mm',
    stemLength: '90mm',
    saddleToBarDrop: '20mm',
    handlebarWidth: '400mm',
    crankLength: '170mm',
  },

  cleatFit: { sitBoneWidth: '112mm', kneeAngle: '38°', cleatPosition: { left: '182mm', right: '182mm' } },

  notes:
    'All bolts torqued to manufacturer spec and checked with a torque wrench. Please re-check saddle and stem bolts after your first two rides as cables and components settle. Contact us if you feel any discomfort after your first few sessions.',

  emailStatus: { profileEmailSent: true, profileEmailSentAt: '2026-07-15T10:08:00.000Z' },
  review: { optedOut: true, clicked: false },
  followUp: { sent: false, sentAt: null },
}

const demoClientC = {
  id: 'demo-michael-botha',
  createdAt: '2026-02-10T08:45:00.000Z',
  fitDate: '2026-02-10',
  fitSpecialist: 'Ruan Smit',

  client: {
    name: 'Michael Botha',
    email: 'michael.botha@example.com',
    phone: '+27 84 555 0221',
    consentGiven: true,
  },

  bike: { make: 'Giant', model: 'Defy Advanced', size: '56cm' },

  measurements: {
    saddleHeight: '755mm',
    reach: '520mm',
    saddleSetback: '52mm',
    stemLength: '110mm',
    saddleToBarDrop: '30mm',
    handlebarWidth: '440mm',
    crankLength: '177.5mm',
  },

  cleatFit: { sitBoneWidth: '128mm', kneeAngle: '42°', cleatPosition: { left: '195mm', right: '197mm' } },

  notes:
    'All bolts torqued to manufacturer spec and checked with a torque wrench. Please re-check saddle and stem bolts after your first two rides as cables and components settle. Contact us if you feel any discomfort after your first few sessions.',

  emailStatus: { profileEmailSent: true, profileEmailSentAt: '2026-02-10T08:50:00.000Z' },
  review: { optedOut: false, clicked: true },
  followUp: { sent: true, sentAt: '2026-05-11T08:00:00.000Z' },
}

export const demoClients = [demoProfile, demoClientB, demoClientC]

export const DEFAULT_NOTES =
  'All bolts torqued to manufacturer spec and checked with a torque wrench. Please re-check saddle and stem bolts after your first two rides as cables and components settle. Contact us if you feel any discomfort after your first few sessions.'
