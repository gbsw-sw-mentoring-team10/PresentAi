export default function SampleSlideArtwork({ slide, small = false }) {
  return (
    <div className={`slide-art slide-${slide.theme} ${small ? 'small' : ''}`}>
      <div className="slide-art-top">
        <span>OUR NEXT CHAPTER</span>
        <span>2026 / H2</span>
      </div>
      <div className="slide-art-body">
        <div>
          <span className="slide-kicker">{slide.category || 'THE NEXT CHAPTER'}</span>
          <h3>{slide.title}</h3>
          <p>{slide.subtitle}</p>
        </div>
        <div className="orbit-art" aria-hidden="true">
          <i />
          <i />
          <i />
          <b />
        </div>
      </div>
      <div className="slide-art-footer">
        <span>make an impact.</span>
        <span>{String(slide.id || 1).padStart(2, '0')} — 06</span>
      </div>
    </div>
  )
}
