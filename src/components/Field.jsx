export default function Field({
  label,
  name,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder = '',
  error,
  as = 'input',
  rows = 4,
  className = '',
  inputMode,
}) {
  const baseClasses =
    'w-full rounded-lg bg-ink border px-4 py-3.5 text-[17px] text-off-white placeholder:text-muted/70 outline-none transition-colors focus:border-orange ' +
    (error ? 'border-orange' : 'border-border')

  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-muted">
        {label}
        {required && <span className="text-orange"> *</span>}
      </span>
      {as === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={baseClasses}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={baseClasses}
          inputMode={type === 'tel' ? 'tel' : inputMode}
        />
      )}
      {error && <span className="mt-1.5 block text-sm text-orange">{error}</span>}
    </label>
  )
}
