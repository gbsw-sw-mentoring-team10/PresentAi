export default function ExampleSlide({ slide }) {
  return (
    <div
      className={`deck-example deck-example-${slide.theme}`}
      aria-label={`${slide.id}번 예시 슬라이드: ${slide.title}`}
    >
      <div className="deck-example-top">
        <span>OUR NEXT CHAPTER</span>
        <span>2026 / H2</span>
      </div>
      <div className="deck-example-body">
        <span className="deck-example-kicker">{slide.category}</span>
        <h3>{slide.title}</h3>
        {slide.id === 1 && (
          <>
            <p>{slide.subtitle}</p>
            <div className="deck-example-orbit" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </>
        )}
        {slide.id === 2 && (
          <div className="deck-metrics">
            {[
              ['32만', '월간 활성 사용자'],
              ['24%', '전월 대비 성장'],
              ['4.8', '사용자 만족도'],
            ].map(([value, label]) => (
              <div key={label}>
                <b>{value}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
        {slide.id === 3 && (
          <>
            <p>{slide.subtitle}</p>
            <div className="deck-market">
              <div>
                <span>시장 규모</span>
                <b>12조 원</b>
              </div>
              <div>
                <span>연평균 성장률</span>
                <b>
                  18<span>%</span>
                </b>
              </div>
              <div className="deck-bars" aria-hidden="true">
                {[28, 40, 54, 72, 94].map((height) => (
                  <i key={height} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
            <div className="deck-terms">
              TAM <span>→</span> SAM <span>→</span> SOM
            </div>
          </>
        )}
        {slide.id === 4 && (
          <div className="deck-roadmap">
            <div>
              <b>Q3</b>
              <span>사용자 경험 개선</span>
              <span>온보딩 개편</span>
              <span>데이터 기반 마련</span>
            </div>
            <div>
              <b>Q4</b>
              <span>핵심 기능 확장</span>
              <span>협업 기능 출시</span>
              <span>성과 점검과 개선</span>
            </div>
          </div>
        )}
        {slide.id === 5 && (
          <div className="deck-teams">
            {[
              ['기획', '문제 정의와 방향'],
              ['디자인', '경험 설계와 검증'],
              ['개발', '구현과 서비스 개선'],
            ].map(([name, description]) => (
              <div key={name}>
                <b>{name}</b>
                <span>{description}</span>
              </div>
            ))}
          </div>
        )}
        {slide.id === 6 && (
          <>
            <p>핵심에 집중하고, 함께 실행합니다.</p>
            <div className="deck-ending">
              <span>01 방향을 이해하기</span>
              <span>02 역할을 연결하기</span>
              <span>03 함께 실행하기</span>
            </div>
          </>
        )}
      </div>
      <div className="deck-example-footer">
        <span>make an impact.</span>
        <span>{String(slide.id).padStart(2, '0')} / 06</span>
      </div>
    </div>
  )
}
