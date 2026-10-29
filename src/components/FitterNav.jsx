import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/clients', label: 'Clients' },
  { to: '/new-fits', label: 'New bike fits' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/components', label: 'Components' },
  { to: '/new', label: 'New fit' },
  { to: '/components/new', label: 'New component' },
]

// Always-on top bar for the fitter-only screens. `children` is an optional
// right-hand slot (AuthGate puts the signed-in email + sign out there).
// Below `lg` the links collapse into a hamburger menu — six tabs don't fit
// across a phone or tablet without sideways scrolling.
export default function FitterNav({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="border-b border-border bg-ink">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="fitter-nav-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="-ml-2 flex items-center gap-2 px-2 py-3 text-sm font-medium text-off-white lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
          Menu
        </button>
        <div className="-mx-2 hidden overflow-x-auto lg:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
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
      {open && (
        <div id="fitter-nav-menu" className="border-t border-border lg:hidden">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block border-l-2 px-4 py-3.5 text-[15px] font-medium ${
                  isActive ? 'border-orange bg-orange/10 text-orange' : 'border-transparent text-off-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
