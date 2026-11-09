import Icon from '../../components/ui/Icon.jsx'

export default function FeedbackSteps({ current = 1 }) {
  return (
    <ol className="stepper" aria-label="피드백 진행 단계">
      {['자료 입력', '분석 진행', '결과 확인'].map((x, i) => (
        <li
          key={x}
          className={i + 1 === current ? 'current' : i + 1 < current ? 'complete' : ''}
          aria-current={i + 1 === current ? 'step' : undefined}
        >
          <span>{i + 1 < current ? <Icon name="check" size={13} /> : `0${i + 1}`}</span>
          {x}
          {i < 2 && <i />}
        </li>
      ))}
    </ol>
  )
}
