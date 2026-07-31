import bikeGraphic from '../assets/bike-graphic-v2.jpg'

// Numbered callouts over the brand's bike-graphic-v2 artwork, matching the
// measurement rows in ClientProfileView (same 1-7 order as
// measurementLabels). The artwork's background (#141416) is an exact match
// for the card it sits on, so it drops in with no visible seam. Coordinates
// are in the image's native 349x233 pixel space.
const ORANGE = '#E8672B'

function Pin({ x, y, n }) {
  return (
    <g>
      <circle cx={x} cy={y} r={11} fill="#0B0B0C" stroke={ORANGE} strokeWidth="1.5" />
      <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700" fill={ORANGE}>
        {n}
      </text>
    </g>
  )
}

function Dashed({ points }) {
  return <polyline points={points} fill="none" stroke={ORANGE} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.85" />
}

export default function FitDiagram() {
  return (
    <div className="rounded-xl border border-border bg-ink-raised p-5">
      <div className="relative">
        <img src={bikeGraphic} alt="Bike fit measurement diagram" className="block w-full h-auto" />
        <svg viewBox="0 0 349 233" className="absolute inset-0 h-full w-full">
          {/* 1 — saddle height: vertical, left margin */}
          <Dashed points="18,52 18,80" />
          <Dashed points="18,116 18,145" />
          <line x1="12" y1="52" x2="24" y2="52" stroke={ORANGE} strokeWidth="1.5" />
          <line x1="12" y1="145" x2="24" y2="145" stroke={ORANGE} strokeWidth="1.5" />
          <Pin x={18} y={98} n={1} />

          {/* 2 — reach: elevated line from saddle nose to hoods */}
          <Dashed points="148,52 148,14" />
          <Dashed points="224,60 224,14" />
          <Dashed points="163,14 189,14" />
          <Dashed points="207,14 209,14" />
          <Pin x={196} y={14} n={2} />

          {/* 3 — saddle setback: short tick above the saddle */}
          <Dashed points="115,45 115,34 148,34 148,45" />
          <Pin x={115} y={24} n={3} />

          {/* 4 — stem length: badge sits in the open frame triangle,
              leader points up to the stem/hoods junction */}
          <Dashed points="218,70 194,86" />
          <Pin x={188} y={90} n={4} />

          {/* 5 — saddle-to-bar drop: vertical, right of hoods */}
          <Dashed points="224,60 335,60" />
          <Dashed points="148,52 335,52" />
          <Dashed points="335,52 335,60" />
          <Pin x={335} y={38} n={5} />

          {/* 6 — handlebar width: small tick near the front */}
          <Dashed points="300,110 300,130" />
          <Pin x={300} y={141} n={6} />

          {/* 7 — crank length: near the bottom bracket / pedal */}
          <Dashed points="150,150 150,168" />
          <Pin x={150} y={179} n={7} />
        </svg>
      </div>
    </div>
  )
}
