import Icon from '../../components/ui/Icon.jsx'

export default function FeatureSection() {
  return (
    <section className="features section-wrap" id="features">
      <div className="section-heading">
        <div>
          <span className="section-kicker">MAKE YOUR POINT.</span>
          <h2>
            준비는 꼼꼼하게.
            <br />
            발표는 자신 있게.
          </h2>
        </div>
        <p>
          무엇을 고쳐야 할지 막막할 때,
          <br />더 나은 발표를 위한 맞춤형 피드백.
        </p>
      </div>
      <div className="feature-grid">
        <article className="feature-card material-card">
          <div className="feature-card-top">
            <span className="feature-icon">
              <Icon name="slides" size={27} />
            </span>
            <span className="tag tag-outline">자료 피드백</span>
          </div>
          <h3>
            좋은 자료가
            <br />
            좋은 발표의 시작이니까.
          </h3>
          <p>
            발표 목적, 논리 흐름, 가독성을 한 번에.
            <br />
            슬라이드마다 필요한 변화를 확인하세요.
          </p>
          <ul>
            <li>
              <Icon name="check" size={16} />
              슬라이드별 가독성과 수정 제안
            </li>
            <li>
              <Icon name="check" size={16} />
              논리 흐름과 빠진 내용 점검
            </li>
            <li>
              <Icon name="check" size={16} />
              권장 발표 시간과 정보 확인
            </li>
          </ul>
          <div className="card-decoration" aria-hidden="true">
            <img src="/icons/ppt-file.svg" alt="" width={95} height={100} />
          </div>
        </article>
        <article className="feature-card speech-card">
          <div className="feature-card-top">
            <span className="feature-icon">
              <Icon name="mic" size={27} />
            </span>
            <span className="tag tag-outline">발표 전달력 피드백</span>
          </div>
          <h3>
            써 내려간 문장이
            <br />잘 전달되는 말이 되도록.
          </h3>
          <p>
            대본과 리허설 음성을 나란히.
            <br />
            전달 방식을 돌아보는 새로운 연습.
          </p>
          <ul>
            <li>
              <Icon name="check" size={16} />
              대본과 실제 발화 비교
            </li>
            <li>
              <Icon name="check" size={16} />
              발음·전달 방식 피드백
            </li>
            <li>
              <Icon name="check" size={16} />
              다음 연습을 위한 개선 제안
            </li>
          </ul>
          <div className="wave-decoration" aria-hidden="true">
            {[20, 36, 64, 94, 55, 76, 110, 73, 43, 64, 35, 18].map((h, i) => (
              <i style={{ height: h }} key={i} />
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
