// Simplified side-view road bike with numbered callouts matching the
// measurement rows in ClientProfileView (same 1-7 order as
// measurementLabels). Frame lines are neutral so the orange callouts read
// as the "highlight" layer on top, per the brand's sparing-use-of-accent
// rule. Loosely modelled on the classic lettered bike-geometry chart
// (bikefit-diag.png) but redrawn schematic/simplified rather than to
// scale — the goal is "recognizable at a glance," not engineering
// precision.

const FRAME = 'rgba(245, 244, 242, 0.55)'
const FRAME_STRONG = 'rgba(245, 244, 242, 0.75)'
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
      <svg viewBox="0 0 640 340" className="h-auto w-full" role="img" aria-label="Bike fit measurement diagram">
        {/* ground */}
        <line x1="40" y1="308" x2="560" y2="308" stroke={FRAME} strokeWidth="1" opacity="0.25" />

        {/* wheels */}
        <circle cx="110" cy="250" r="58" fill="none" stroke={FRAME} strokeWidth="2" />
        <circle cx="490" cy="250" r="58" fill="none" stroke={FRAME} strokeWidth="2" />
        <circle cx="110" cy="250" r="6" fill="none" stroke={FRAME} strokeWidth="1.5" />
        <circle cx="490" cy="250" r="6" fill="none" stroke={FRAME} strokeWidth="1.5" />

        {/* frame */}
        <path
          d="M110,250 L215,250 L195,120 L110,250 M195,120 L410,130 M215,250 L420,175 L490,250 M420,175 L410,130"
          fill="none"
          stroke={FRAME_STRONG}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* seatpost + saddle */}
        <path d="M195,120 L182,95" stroke={FRAME_STRONG} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M153,98 Q180,86 212,90" fill="none" stroke={FRAME_STRONG} strokeWidth="3" strokeLinecap="round" />

        {/* stem + drop bar */}
        <path d="M410,130 L436,104" stroke={FRAME_STRONG} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M436,104 Q462,107 462,122 Q462,136 449,141" fill="none" stroke={FRAME_STRONG} strokeWidth="2.5" strokeLinecap="round" />

        {/* crank + pedal */}
        <line x1="215" y1="250" x2="215" y2="300" stroke={FRAME_STRONG} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="205" y="298" width="20" height="7" rx="2" fill="none" stroke={FRAME_STRONG} strokeWidth="2" />

        {/* 1 — saddle height: vertical, left of bike */}
        <line x1="70" y1="90" x2="80" y2="90" stroke={ORANGE} strokeWidth="1.5" />
        <line x1="70" y1="250" x2="80" y2="250" stroke={ORANGE} strokeWidth="1.5" />
        <Dashed points="70,111 70,159" />
        <Dashed points="70,181 70,229" />
        <Pin x={70} y={170} n={1} />

        {/* 2 — reach: elevated horizontal line, saddle nose to hoods */}
        <Dashed points="212,90 212,45" />
        <Dashed points="462,122 462,45" />
        <Dashed points="233,45 313,45" />
        <Dashed points="357,45 437,45" />
        <Pin x={335} y={45} n={2} />

        {/* 3 — saddle setback: short offset above saddle + BB plumb line */}
        <Dashed points="176,68 176,58 215,58 215,72" />
        <Dashed points="215,95 215,240" />
        <Pin x={195} y={58} n={3} />

        {/* 4 — stem length: badge above the stem, short leader down to it */}
        <Dashed points="418,88 423,117" />
        <Pin x={412} y={76} n={4} />

        {/* 5 — saddle-to-bar drop: vertical, right of hoods */}
        <Dashed points="462,90 530,90" />
        <Dashed points="462,122 530,122" />
        <Dashed points="530,111 530,101" />
        <Pin x={530} y={106} n={5} />

        {/* 6 — handlebar width: small width tick under the hoods */}
        <Dashed points="446,155 446,147 476,147 476,155" />
        <Dashed points="461,167 461,159" />
        <Pin x={461} y={178} n={6} />

        {/* 7 — crank length: beside the crank arm */}
        <Dashed points="215,275 234,275" />
        <Pin x={244} y={275} n={7} />
      </svg>
    </div>
  )
}
