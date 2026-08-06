import bikeGraphic from '../assets/bike-graphic-v6.jpg'

// The artwork itself now has the measurement callouts (lettered A-E, G, H
// — skipping F) baked in by the designer, so this just displays it. The
// letters correspond, in order, to the measurement rows in
// ClientProfileView (saddle height, reach, setback, stem, drop, width,
// crank) — see the `letter` values passed to <Row> there.
export default function FitDiagram() {
  return (
    <div className="rounded-xl border border-border bg-ink-raised p-5">
      <img src={bikeGraphic} alt="Bike fit measurement diagram" className="block w-full h-auto" />
    </div>
  )
}
