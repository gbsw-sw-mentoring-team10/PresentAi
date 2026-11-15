import Icon from '../../components/ui/Icon.jsx'

export default function FrequentlyAskedQuestions() {
  return (
    <section className="faq-section section-wrap">
      <div>
        <span className="section-kicker">A LITTLE MORE CLARITY.</span>
        <h2>
          시작하기 전
          <br />
          자주 묻는 질문
        </h2>
      </div>
      <div className="faq-list">
        {[
          [
            '어떤 발표자료를 올릴 수 있나요?',
            'PPT, PPTX, PDF, HTML 파일을 올릴 수 있고, 발표자료 파일은 최대 30MB까지 가능해요. 자료 파일이 없다면 대본을 TXT 파일로 올리거나 직접 입력해도 분석할 수 있어요.',
          ],
          [
            '발표 목적은 어떻게 적으면 좋나요?',
            '누구에게, 무엇을, 얼마 동안 이야기하는지 함께 적어 주세요. 예를 들어 “팀원 10명에게 신규 기능을 10분 안에 소개하고 의견 받기”처럼 구체적으로 적을수록 목적에 맞는 피드백을 받을 수 있어요.',
          ],
          [
            '받은 피드백은 어디서 다시 볼 수 있나요?',
            '로그인한 상태에서 받은 발표자료 피드백은 자동으로 저장돼요. 마이페이지의 ‘내 피드백 보기’에서 점수와 피드백을 다시 확인하고, 필요 없는 기록은 삭제할 수 있어요. 로그인하지 않고 받은 피드백과 음성 분석 결과는 저장되지 않아요.',
          ],
          [
            '발표 음성은 어떻게 준비하면 되나요?',
            '발표 피드백 화면에서 바로 녹음하거나 MP3, WAV, M4A, OGG, WEBM 파일을 올리면 돼요. 대본을 함께 넣으면 준비한 대본과 실제로 말한 내용을 나란히 비교해 볼 수 있어요.',
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
