import Icon from '../../components/ui/Icon.jsx'

export default function SubmissionNotice({ speech, isExample }) {
  return (
    <div className="demo-notice">
      <Icon name="info" size={19} />
      <p>
        <strong>
          {speech
            ? '음성 피드백은 기능 미리보기입니다.'
            : isExample
              ? '예시 자료로 분석 흐름을 체험합니다.'
              : '입력한 자료로 분석을 요청합니다.'}
        </strong>
        <br />
        {speech
          ? '음성 분석 API는 아직 제공되지 않아 준비된 예시 결과를 보여 드려요.'
          : isExample
            ? '서버의 샘플 결과를 표시합니다. 실제 파일을 선택하면 해당 자료로 분석을 요청합니다.'
            : '발표 정보·대본·발표자료를 분석 서버에 전송합니다. 로그인한 사용자의 실제 분석 결과만 자동 저장하며, 음성파일은 전송하거나 저장하지 않습니다.'}
      </p>
    </div>
  )
}
