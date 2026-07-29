export default function SectionCard({ step, title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-border bg-ink-raised p-5 sm:p-7 ${className}`}>
      <div className="mb-6 flex items-baseline gap-3">
        {step && (
          <span className="text-sm font-semibold text-orange tabular-nums">{step}</span>
        )}
        <div>
          <h2 className="text-lg font-semibold text-off-white sm:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}
