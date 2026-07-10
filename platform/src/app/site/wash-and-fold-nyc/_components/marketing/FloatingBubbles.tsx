'use client'

export default function FloatingBubbles() {
  // Generate 20 bubbles with varied sizes, positions, and timing
  const bubbles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: 8 + Math.random() * 40,
    left: Math.random() * 100,
    delay: Math.random() * 15,
    duration: 12 + Math.random() * 18,
    swayDuration: 3 + Math.random() * 4,
  }))

  return (
    <div className="bubbles-container" aria-hidden="true">
      {bubbles.map(b => (
        <div
          key={b.id}
          className="bubble"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            bottom: '-50px',
            animationDuration: `${b.duration}s, ${b.swayDuration}s`,
            animationDelay: `${b.delay}s, ${b.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
