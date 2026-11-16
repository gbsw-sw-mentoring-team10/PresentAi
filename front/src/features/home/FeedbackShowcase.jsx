import Icon from '../../components/ui/Icon.jsx'
import HeroSlideArtwork from './HeroSlideArtwork.jsx'
import { homeSlides } from './homeSlides.js'
import useHeroCarousel from './useHeroCarousel.js'
import '../../styles/home-carousel.css'

export default function FeedbackShowcase({ onStart, slides = homeSlides }) {
  const { frame, activeIndex, playing, reducedMotion, viewportRef, select, toggle, finish } =
    useHeroCarousel(slides.length)

  if (!slides.length) return null
  // 마지막 장 뒤에 첫 장을 이어 붙여, 같은 방향으로 자연스럽게 반복합니다.
  const frames = slides.length > 1 ? [...slides, slides[0]] : slides

  return (
    <div
      className="hero-deck"
      role="region"
      aria-label="PresentAi 소개"
      aria-roledescription="캐러셀"
    >
      <div ref={viewportRef} className="hero-deck-viewport" aria-live={playing ? 'off' : 'polite'}>
        <div
          className="hero-deck-track"
          style={{
            transform: `translateX(-${frame.position * 100}%)`,
            transition: frame.animated && !reducedMotion ? undefined : 'none',
          }}
          onTransitionEnd={finish}
        >
          {frames.map((slide, index) => (
            <div
              key={`${slide.id}-${index}`}
              className={`hero-deck-slide hero-deck-slide-${slide.tone || 'yellow'}${slide.cards?.length ? ' hero-deck-slide-with-cards' : ''}${slide.image ? ' hero-deck-slide-image' : ''}`}
              role="group"
              aria-roledescription="슬라이드"
              aria-label={`${index + 1} / ${slides.length}`}
              aria-hidden={index !== activeIndex}
              inert={index !== activeIndex}
            >
              {slide.image ? (
                <img src={slide.image} alt={slide.title} draggable="false" decoding="async" />
              ) : (
                <>
                  <div className="hero-slide-topline">
                    <span>{slide.label || 'PresentAI'}</span>
                    <span aria-hidden="true">
                      {String((index % slides.length) + 1).padStart(2, '0')} /{' '}
                      {String(slides.length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="hero-slide-main">
                    <div className="hero-slide-copy">
                      <h2>
                        {slide.lines.map((line, lineIndex) => (
                          <span key={lineIndex}>{line}</span>
                        ))}
                      </h2>
                      {slide.description && <p>{slide.description}</p>}
                    </div>
                    <HeroSlideArtwork variant={slide.id} />
                  </div>
                  {!!slide.cards?.length && (
                    <ul className="hero-slide-cards">
                      {slide.cards.map(([label, name, description]) => (
                        <li key={name}>
                          <span className="hero-slide-card-label">{label}</span>
                          <strong>{name}</strong>
                          <span>{description}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="hero-deck-footer">
        <div className="hero-deck-controls">
          {slides.length > 1 && (
            <>
              <div className="hero-deck-dots" role="group" aria-label="소개 슬라이드 선택">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`${index + 1}번 슬라이드: ${slide.title}`}
                    aria-current={activeIndex === index ? 'true' : undefined}
                    onClick={() => select(index)}
                  >
                    <span />
                  </button>
                ))}
              </div>
              {!reducedMotion && (
                <button
                  type="button"
                  className="hero-deck-play"
                  onClick={toggle}
                  aria-label={playing ? '슬라이드 자동 재생 멈추기' : '슬라이드 자동 재생 시작'}
                >
                  <Icon name={playing ? 'pause' : 'play'} size={15} />
                </button>
              )}
            </>
          )}
        </div>
        <button type="button" className="hero-deck-guide" onClick={onStart}>
          자료 점검하기
          <Icon name="arrow" size={17} />
        </button>
      </div>
    </div>
  )
}
