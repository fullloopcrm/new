export default function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const px = size === 'md' ? '0.5rem 0.75rem' : '0.25rem 0.5rem'
  const fontSize = size === 'md' ? '0.875rem' : '0.75rem'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: px,
      borderRadius: '9999px',
      backgroundColor: '#eff6ff',
      color: '#2563eb',
      fontSize,
      fontWeight: 600,
    }}>
      <span>&#10003;</span> Verified
    </span>
  )
}
