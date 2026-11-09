import Icon from '../../components/ui/Icon.jsx'

export default function FrequentlyAskedQuestions() {
  return (
    <section className="faq-section section-wrap">
      <div>
        <span className="section-kicker">A LITTLE MORE CLARITY.</span>
        <h2>
          시작하기 전에
          <br />
          궁금한 것들.
        </h2>
      </div>
      <div className="faq-list">
        {[
          [
            '어떤 발표자료를 올릴 수 있나요?',
            'PPT, PPTX, PDF, HTML 파일을 선택할 수 있어요. 체험 화면의 파일 크기는 최대 30MB입니다. 대본은 TXT 파일로 올리거나 직접 입력할 수 있어요.',
          ],
          [
            '발표 목적은 어떻게 적으면 좋나요?',
            '청중, 전달하고 싶은 내용, 발표 시간을 함께 알려 주세요. 예를 들어 “신입 사원에게 하반기 로드맵을 10분 안에 소개”처럼 구체적으로 적으면 좋아요.',
          ],
          [
            '지금 실제 자료를 분석할 수 있나요?',
            '분석 시작 시 발표 정보·대본·선택한 발표자료를 분석 서버로 전송합니다. 서버가 반환한 점수와 피드백을 확인할 수 있어요. 예시 결과 둘러보기는 별도의 샘플 화면이며, 음성 피드백은 준비 중입니다.',
          ],
          [
            '음성 피드백도 사용할 수 있나요?',
            '음성 피드백은 준비 중인 기능으로, 입력과 결과 화면을 미리 볼 수 있어요. 대본 비교와 발음 분석의 실제 기준은 추후 확정됩니다.',
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <Icon name="plus" size={20} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
