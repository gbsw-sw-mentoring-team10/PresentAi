import Icon from '../../components/ui/Icon.jsx'

export default function SubmissionNotice({ speech, isExample }) {
  return (
    <div className="demo-notice">
      <Icon name="info" size={19} />
      <p>
        <strong>
          {speech
            ? isExample
              ? '예시 음성으로 분석 흐름을 체험합니다.'
              : '입력한 음성으로 분석을 요청합니다.'
            : isExample
              ? '예시 자료로 분석 흐름을 체험합니다.'
              : '입력한 자료로 분석을 요청합니다.'}
        </strong>
        <br />
        {speech
          ? isExample
            ? '서버의 샘플 결과를 표시합니다. 실제 음성 파일을 선택하면 입력한 음성으로 분석합니다.'
            : '음성을 분석 서버로 전송해 텍스트로 바꾸고 발음을 평가합니다. 음성과 결과는 저장하지 않아요.'
          : isExample
            ? '서버의 샘플 결과를 표시합니다. 내용을 수정하거나 실제 파일을 선택하면 입력한 자료로 분석을 요청합니다.'
            : '발표 정보·대본·발표자료를 분석 서버에 전송합니다. 로그인한 사용자의 실제 분석 결과만 자동 저장합니다.'}
      </p>
    </div>
  )
}
