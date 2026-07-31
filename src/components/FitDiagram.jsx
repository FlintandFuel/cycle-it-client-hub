import bikeGraphic from '../assets/bike-graphic-v2.jpg'

// Numbered callouts over the brand's bike-graphic artwork, matching the
// measurement rows in ClientProfileView (same 1-7 order as
// measurementLabels). The artwork's background (#141416) is an exact
// match for the card it sits on, so it drops in with no visible seam.
// Coordinates are in the image's native 349x233 pixel space, read off the
// actual artwork (not guessed) so every callout anchors to a specific,
// identifiable point — no floating dashes in open space.
const ORANGE = '#E8672B'
const TICK = 5

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

const dash = { stroke: ORANGE, strokeWidth: 1.5, strokeDasharray: '4 3', opacity: 0.9 }
const solid = { stroke: ORANGE, strokeWidth: 1.5, opacity: 0.9 }

// A proper two-point dimension line: end caps at each anchor, a leader
// from the anchor to the ruler, the ruler itself broken by the numbered
// badge at its midpoint — same convention as a printed spec sheet, so
// which two points a number spans is never in doubt.
function DimensionV({ x, y1, y2, anchor1X, anchor2X, n }) {
  const mid = (y1 + y2) / 2
  return (
    <g>
      {anchor1X !== x && <line x1={anchor1X} y1={y1} x2={x} y2={y1} {...dash} />}
      {anchor2X !== x && <line x1={anchor2X} y1={y2} x2={x} y2={y2} {...dash} />}
      <line x1={x - TICK} y1={y1} x2={x + TICK} y2={y1} {...solid} />
      <line x1={x - TICK} y1={y2} x2={x + TICK} y2={y2} {...solid} />
      <line x1={x} y1={y1} x2={x} y2={mid - 13} {...solid} />
      <line x1={x} y1={mid + 13} x2={x} y2={y2} {...solid} />
      <Pin x={x} y={mid} n={n} />
    </g>
  )
}

function DimensionH({ y, x1, x2, anchor1Y, anchor2Y, n }) {
  const mid = (x1 + x2) / 2
  return (
    <g>
      {anchor1Y !== y && <line x1={x1} y1={anchor1Y} x2={x1} y2={y} {...dash} />}
      {anchor2Y !== y && <line x1={x2} y1={anchor2Y} x2={x2} y2={y} {...dash} />}
      <line x1={x1} y1={y - TICK} x2={x1} y2={y + TICK} {...solid} />
      <line x1={x2} y1={y - TICK} x2={x2} y2={y + TICK} {...solid} />
      <line x1={x1} y1={y} x2={mid - 13} y2={y} {...solid} />
      <line x1={mid + 13} y1={y} x2={x2} y2={y} {...solid} />
      <Pin x={mid} y={y} n={n} />
    </g>
  )
}

// A single unambiguous leader from the badge straight to one component —
// used where the measurement is really "this part," not a span.
function PointLabel({ x, y, toX, toY, n }) {
  return (
    <g>
      <line x1={x} y1={y} x2={toX} y2={toY} {...dash} />
      <circle cx={toX} cy={toY} r="2.5" fill={ORANGE} />
      <Pin x={x} y={y} n={n} />
    </g>
  )
}

// Key anchors read directly off bike-graphic-v2.jpg (349x233):
const BB = { x: 133, y: 140 } // bottom bracket / frame apex
const SADDLE_NOSE = { x: 150, y: 53 }
const SEAT_POST_X = 133
const HEAD_JUNCTION = { x: 240, y: 78 } // top tube / down tube / hoods base
const HOODS_TOP = { x: 246, y: 58 }
const PEDAL = { x: 133, y: 178 }
const WIDTH_INSET = { x: 320, y: 60 } // the separate bar-width cross-section glyph

export default function FitDiagram() {
  return (
    <div className="rounded-xl border border-border bg-ink-raised p-5">
      <div className="relative">
        <img src={bikeGraphic} alt="Bike fit measurement diagram" className="block w-full h-auto" />
        <svg viewBox="0 0 349 233" className="absolute inset-0 h-full w-full">
          {/* 1 — saddle height: BB to saddle top, ruler beside the seat tube */}
          <DimensionV x={92} y1={SADDLE_NOSE.y} y2={BB.y} anchor1X={SEAT_POST_X} anchor2X={BB.x} n={1} />

          {/* 2 — reach: saddle nose to hoods, ruler above the bike */}
          <DimensionH y={22} x1={SADDLE_NOSE.x} x2={HOODS_TOP.x} anchor1Y={SADDLE_NOSE.y} anchor2Y={HOODS_TOP.y} n={2} />

          {/* 3 — saddle setback: BB plumb line to saddle nose. This span (17px) is
              narrower than the badge itself, so it can't use the line-broken-by-badge
              convention — instead the ruler stays intact and a stub carries the
              badge up and clear, off to the side. */}
          <line x1={SEAT_POST_X} y1={44} x2={SADDLE_NOSE.x} y2={44} {...solid} />
          <line x1={SEAT_POST_X} y1={44 - TICK} x2={SEAT_POST_X} y2={44 + TICK} {...solid} />
          <line x1={SADDLE_NOSE.x} y1={44 - TICK} x2={SADDLE_NOSE.x} y2={44 + TICK} {...solid} />
          <line x1={SADDLE_NOSE.x} y1={SADDLE_NOSE.y} x2={SADDLE_NOSE.x} y2={44} {...dash} />
          <line x1={SEAT_POST_X} y1={44} x2={SEAT_POST_X} y2={25} {...solid} />
          <line x1={SEAT_POST_X} y1={44} x2={SEAT_POST_X} y2={BB.y} stroke={ORANGE} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
          <Pin x={SEAT_POST_X} y={25} n={3} />

          {/* 4 — stem length: points to the head-tube/hoods junction */}
          <PointLabel x={195} y={100} toX={HEAD_JUNCTION.x - 4} toY={HEAD_JUNCTION.y + 4} n={4} />

          {/* 5 — saddle-to-bar drop: saddle height to hoods height, ruler right of the hoods */}
          <DimensionV x={278} y1={SADDLE_NOSE.y} y2={HEAD_JUNCTION.y} anchor1X={SADDLE_NOSE.x} anchor2X={HEAD_JUNCTION.x} n={5} />

          {/* 6 — handlebar width: points to the bar-width inset glyph */}
          <PointLabel x={300} y={100} toX={WIDTH_INSET.x - 6} toY={WIDTH_INSET.y + 12} n={6} />

          {/* 7 — crank length: points to the crank arm */}
          <PointLabel x={165} y={165} toX={BB.x + 4} toY={(BB.y + PEDAL.y) / 2} n={7} />
        </svg>
      </div>
    </div>
  )
}
