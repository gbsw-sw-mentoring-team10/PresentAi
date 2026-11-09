import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

export default function MissingMaterials({ speech, navigate }) {
  return (
    <div className="state-page">
      <div className="state-icon">
        <Icon name="file" size={32} />
      </div>
      <span className="section-kicker">NO MATERIALS YET</span>
      <h1>아직 확인할 자료가 없어요.</h1>
      <p>
        자료나 대본을 넣어 주세요.
        <br />
        준비된 예시 자료로 화면을 둘러볼 수도 있어요.
      </p>
      <Button onClick={() => navigate(speech ? '/speech' : '/materials')}>
        입력 화면으로 돌아가기
      </Button>
    </div>
  )
}
