import Icon from '../../components/ui/Icon.jsx'
import SampleSlideArtwork from '../slides/SampleSlideArtwork.jsx'
import { slides, priorities } from '../../data/examplePresentation.js'

export default function ExampleOverview({ resolved, toggle, openSlide, onShowSlides }) {
  return (
    <>
      <div className="overview-grid">
        <section className="summary-card">
          <div className="card-label">
            <Icon name="sparkle" size={18} />
            전체 피드백
          </div>
          <h2>
            흐름은 좋아요.
            <br />
            <mark>핵심을 더 선명하게</mark> 만들어 봐요.
          </h2>
          <p>
            현황에서 계획, 실행으로 이어지는 구조가 자연스러워요. 신입 사원의 눈높이에 맞춰 전문
            용어를 풀고, 핵심 지표를 강조하면 더 이해하기 쉬운 발표가 됩니다.
          </p>
          <div className="summary-chips">
            <span>
              <Icon name="check" size={14} />
              명확한 발표 주제
            </span>
            <span>
              <Icon name="check" size={14} />
              자연스러운 전개
            </span>
          </div>
        </section>
        <section className="time-card">
          <div className="card-label">
            <Icon name="clock" size={18} />
            권장 발표 시간
          </div>
          <h2>
            10<span>분</span>
          </h2>
          <p>6장의 슬라이드, 균형 있는 전달</p>
          <div className="time-bars">
            {slides.map((s, i) => (
              <button
                key={s.id}
                aria-label={`${s.id}번 슬라이드 ${s.time}`}
                onClick={() => openSlide(s.id)}
                style={{ height: [24, 46, 65, 83, 65, 46][i] }}
              >
                <span>{s.id}</span>
              </button>
            ))}
          </div>
          <small>내용과 청중에 맞춰 조정해 주세요.</small>
        </section>
      </div>
      <section className="priority-section">
        <div className="subheading">
          <h2>먼저, 이 세 가지만 다듬어 보세요.</h2>
          <span>{priorities.filter((p) => resolved.includes(p.id)).length} / 3 확인 완료</span>
        </div>
        <div className="priority-list">
          {priorities.map((p, i) => (
            <article className={resolved.includes(p.id) ? 'resolved' : ''} key={p.id}>
              <button
                className="resolve-check"
                aria-label={`${p.title} 확인 완료 표시`}
                aria-pressed={resolved.includes(p.id)}
                onClick={() => toggle(p.id)}
              >
                {resolved.includes(p.id) ? (
                  <Icon name="check" size={16} />
                ) : (
                  String(i + 1).padStart(2, '0')
                )}
              </button>
              <div>
                <span className={`priority-label ${i === 0 ? 'urgent' : ''}`}>
                  {p.level} · SLIDE 0{p.slide}
                </span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
              <button
                className="icon-button"
                aria-label={`${p.slide}번 슬라이드 피드백 보기`}
                onClick={() => openSlide(p.slide, p.id)}
              >
                <Icon name="arrow" />
              </button>
            </article>
          ))}
        </div>
      </section>
      <div className="subheading">
        <h2>슬라이드마다, 더 구체적으로.</h2>
        <button className="text-button" onClick={onShowSlides}>
          모두 보기
          <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="slide-grid">
        {slides.slice(0, 3).map((s) => (
          <button className="slide-preview-card" key={s.id} onClick={() => openSlide(s.id)}>
            <SampleSlideArtwork slide={s} small />
            <div>
              <span>
                0{s.id} · {s.category}
              </span>
              <span className={`status-tag ${s.status === '우선 수정' ? 'urgent' : ''}`}>
                {s.status}
              </span>
            </div>
            <h3>{s.title}</h3>
            <small>
              <Icon name="clock" size={13} />
              {s.time}
            </small>
          </button>
        ))}
      </div>
    </>
  )
}
