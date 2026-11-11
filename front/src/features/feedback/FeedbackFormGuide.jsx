import Icon from '../../components/ui/Icon.jsx'

export default function FeedbackFormGuide({ speech, onFillExample }) {
  return (
    <aside className="form-sidebar">
      <div className="side-note">
        <span className="side-note-icon">
          <Icon name="sparkle" size={24} />
        </span>
        <h3>
          좋은 질문이,
          <br />
          좋은 피드백을 만들어요.
        </h3>
        <p>
          발표의 맥락이 구체적일수록
          <br />더 적절한 제안을 할 수 있어요.
        </p>
        <div className="tip-example">
          <small>이렇게 적어 보세요</small>
          <p>
            “팀원 10명에게 신규 기능을
            <br />
            소개하고, 개발 우선순위에
            <br />
            대한 의견을 받고 싶어요.”
          </p>
        </div>
        <div className="side-checks">
          <strong>확인하게 될 내용</strong>
          {(speech
            ? ['말한 내용의 텍스트 변환', '말하기 속도와 쉬는 구간', '발음 정확도·유창성 평가']
            : [
                '발표 목적에 따른 종합 피드백',
                '100점 기준의 발표 점수',
                '잘한 점과 구체적인 개선사항',
                '피드백 보고서 다운로드',
              ]
          ).map((t) => (
            <span key={t}>
              <Icon name="check" size={15} />
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="side-bottom">
        <Icon name="shield" size={19} />
        <p>
          부담 없이 먼저 둘러보세요.
          <br />
          <button onClick={onFillExample}>
            예시 자료로 시작하기 <span>↗</span>
          </button>
        </p>
      </div>
    </aside>
  )
}
