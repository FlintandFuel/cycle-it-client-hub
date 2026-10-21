import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/clients', label: 'Clients' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/components', label: 'Components' },
  { to: '/new', label: 'New fit' },
]

// Always-on top bar for the fitter-only screens. `children` is an optional
// right-hand slot (AuthGate puts the signed-in email + sign out there).
export default function FitterNav({ children }) {
  return (
    <nav className="border-b border-border bg-ink">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="-mx-2 flex overflow-x-auto">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-orange text-orange'
                    : 'border-transparent text-muted hover:text-off-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
        {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
      </div>
    </nav>
  )
}
