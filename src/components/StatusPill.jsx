export function StatusPill({ tone, children }) {
  return <span className={`pill pill--${tone ?? 'neutral'}`}>{children}</span>
}

export function CopyButton({ text, label }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Copy failed', error)
    }
  }
  return (
    <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
      {label ?? 'Copy'}
    </button>
  )
}