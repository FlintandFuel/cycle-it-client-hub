// Large, high-contrast banner for actions a fitter needs to notice from
// across a busy workshop — inline button-text changes are easy to miss
// when you're not looking straight at the screen. Auto-dismisses so it
// doesn't have to be manually cleared every time.
export default function Toast({ tone = 'success', children, onDismiss }) {
  const toneClasses =
    tone === 'success'
      ? 'border-orange bg-orange text-ink'
      : 'border-red-500 bg-red-500 text-white'

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div
        role="status"
        className={`flex w-full max-w-md items-center gap-3 rounded-xl border px-5 py-4 shadow-lg ${toneClasses}`}
      >
        {tone === 'success' ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        )}
        <p className="flex-1 text-[15px] font-semibold">{children}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-lg leading-none opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
