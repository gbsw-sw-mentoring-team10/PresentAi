const STAR =
  '100,0 116,66 171,29 134,84 200,100 134,116 171,171 116,134 100,200 84,134 29,171 66,116 0,100 66,84 29,29 84,66'

function Star({ x, y, size, rotate = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 200}) rotate(${rotate} 100 100)`}>
      <polygon points={STAR} fill="currentColor" />
    </g>
  )
}

function Rings({ x, y, scale = 1 }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <circle cx="45" cy="45" r="43" />
      <circle cx="91" cy="66" r="31" />
      <circle cx="68" cy="92" r="23" />
    </g>
  )
}

// 레퍼런스의 별·아치·겹친 원을 벡터로 구성해 작은 화면에서도 선명하게 보여 줍니다.
export default function HeroSlideArtwork({ variant }) {
  const voice = variant === 'delivery'
  const compact = variant === 'materials' || variant === 'next'

  return (
    <svg className="hero-slide-art" viewBox="0 0 520 420" aria-hidden="true" focusable="false">
      <Rings x={compact ? 20 : 24} y={compact ? 35 : 12} scale={0.9} />
      <Rings x={compact ? 350 : 220} y={compact ? 240 : 48} scale={0.62} />
      <Rings x={compact ? 72 : 95} y={compact ? 270 : 300} scale={0.7} />
      <path
        d={voice ? 'M410 145V67a34 34 0 0 0-68 0v78Z' : 'M153 260v-98a35 35 0 0 0-70 0v98Z'}
        fill="currentColor"
      />
      <Star x={compact ? 228 : 252} y={compact ? 90 : 117} size={compact ? 170 : 184} />
      <Star x={408} y={302} size={76} rotate={12} />
      <Star x={183} y={344} size={46} rotate={-8} />
      <Star x={326} y={61} size={20} />
      <Star x={222} y={225} size={16} />
      <Star x={336} y={360} size={24} rotate={12} />
      {voice && (
        <g stroke="currentColor" strokeWidth="7" strokeLinecap="round">
          {[22, 44, 74, 106, 74, 44, 22].map((height, index) => (
            <path key={index} d={`M${55 + index * 15} ${220 - height / 2}v${height}`} />
          ))}
        </g>
      )}
    </svg>
  )
}
