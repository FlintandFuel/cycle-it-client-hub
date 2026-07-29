// Fictional demo client, realistic fit-chart measurement values.
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

  cleatFit: {
    sitBoneWidth: '120mm',
    kneeAngle: '40°',
    cleatPosition: '190mm',
  },

  notes:
    'All bolts torqued to manufacturer spec and checked with a torque wrench. Please re-check saddle and stem bolts after your first two rides as cables and components settle. Contact us if you feel any discomfort after your first few sessions.',

  emailStatus: {
    profileEmailSent: false,
    profileEmailSentAt: null,
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

export const DEFAULT_NOTES =
  'All bolts torqued to manufacturer spec and checked with a torque wrench. Please re-check saddle and stem bolts after your first two rides as cables and components settle. Contact us if you feel any discomfort after your first few sessions.'
