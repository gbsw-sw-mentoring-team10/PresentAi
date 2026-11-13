export default function Logo({ compact = false, responsive = false, className = '' }) {
  return (
    <span
      role="img"
      aria-label="PresentAi"
      className={`brand-logo ${compact ? 'is-compact' : ''} ${responsive ? 'is-responsive' : ''} ${className}`}
    >
      {!compact && (
        <svg className="brand-full" viewBox="81 191 2012 353" aria-hidden="true">
          <image href="/brand/presentai-full.png" width="2172" height="724" />
        </svg>
      )}
      {(compact || responsive) && (
        <svg className="brand-compact" viewBox="151 121 1770 598" aria-hidden="true">
          <image href="/brand/presentai-compact.png" width="2009" height="783" />
        </svg>
      )}
    </span>
  )
}
