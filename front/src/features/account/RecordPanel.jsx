import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { describeDate } from './accountRecord.js'
import ScoreGauge from './ScoreGauge.jsx'

export default function RecordPanel({ summary, profile, loading, onViewHistory }) {
  const average = summary.average ?? 0

  return (
    <div className="mypage-record">
      <section className="mypage-card mypage-grade" aria-labelledby="mypage-grade-title">
        <div className="card-label">
          <Icon name="sparkle" size={18} />
          <h2 id="mypage-grade-title">나의 발표 등급</h2>
        </div>
        <ScoreGauge
          value={average}
          label="전체 발표 점수"
          description={
            summary.average === null
              ? '아직 받은 피드백이 없어요. 피드백을 받으면 평균 점수가 여기에 쌓여요.'
              : `지금까지 받은 피드백 ${summary.total}개의 평균 점수는 ${summary.average}점이에요.`
          }
        />
      </section>
      <section className="mypage-card" aria-labelledby="mypage-count-title">
        <div className="card-label">
          <Icon name="list" size={18} />
          <h2 id="mypage-count-title">받은 피드백</h2>
        </div>
        <ul className="mypage-stats">
          <li>
            <Icon name="slides" size={20} />
            <span>발표자료 피드백</span>
            <strong>
              {summary.material}
              <small>개</small>
            </strong>
          </li>
          <li>
            <Icon name="mic" size={20} />
            <span>발표 피드백</span>
            <strong>
              {summary.speech}
              <small>개</small>
            </strong>
          </li>
          <li>
            <Icon name="check" size={20} />
            <span>전체</span>
            <strong>
              {summary.total}
              <small>개</small>
            </strong>
          </li>
        </ul>
        <Button variant="outline" icon="list" onClick={onViewHistory}>
          내 피드백 보기
        </Button>
      </section>
      <section className="mypage-card" aria-labelledby="mypage-history-title">
        <div className="card-label">
          <Icon name="clock" size={18} />
          <h2 id="mypage-history-title">계정 기록</h2>
        </div>
        <dl className="mypage-dates">
          <div>
            <dt>최초 가입일</dt>
            <dd>{describeDate(profile?.createdAt, loading, '정보 없음')}</dd>
          </div>
          <div>
            <dt>마지막 비밀번호 변경</dt>
            <dd>{describeDate(profile?.passwordUpdatedAt, loading)}</dd>
          </div>
          <div>
            <dt>마지막 이메일 변경</dt>
            <dd>{describeDate(profile?.emailUpdatedAt, loading)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
