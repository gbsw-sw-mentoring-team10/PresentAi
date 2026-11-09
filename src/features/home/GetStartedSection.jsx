import Button from '../../components/ui/Button.jsx'

export default function GetStartedSection({ navigate }) {
  return (
    <section className="final-cta section-wrap">
      <div>
        <span className="section-kicker">YOUR IDEAS DESERVE TO BE HEARD.</span>
        <h2>
          다음 발표는,
          <br />더 자신 있는 당신으로.
        </h2>
        <Button onClick={() => navigate('/materials')}>내 발표자료 점검하기</Button>
      </div>
      <div className="cta-mark" aria-hidden="true">
        ↗
        <span>
          make
          <br />
          your point.
        </span>
      </div>
    </section>
  )
}
