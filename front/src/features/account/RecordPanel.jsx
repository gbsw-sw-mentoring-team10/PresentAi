import { useState } from 'react'
import Icon from '../../components/ui/Icon.jsx'
import { describeDate } from './accountRecord.js'
import ScoreGauge from './ScoreGauge.jsx'

export default function RecordPanel({ summary, profile, loading }) {
  const average = summary.average ?? 0
  const [preview, setPreview] = useState(String(average))
  const typed = preview.trim() === '' ? average : Number(preview)
  const outOfRange = !Number.isFinite(typed) || typed < 0 || typed > 100

  return (
    <div className="mypage-record">
      <section className="mypage-card mypage-grade" aria-labelledby="mypage-grade-title">
        <div className="card-label">
          <Icon name="sparkle" size={18} />
          <h2 id="mypage-grade-title">나의 발표 등급</h2>
        </div>
        <ScoreGauge
          value={typed}
          label="전체 발표 점수"
          description={
            summary.average === null
              ? '아직 받은 피드백이 없어요. 피드백을 받으면 평균 점수가 여기에 쌓여요.'
              : `지금까지 받은 피드백 ${summary.total}개의 평균 점수는 ${summary.average}점이에요.`
          }
        />
        <div className="score-preview">
          <div className="score-preview-head">
            <span className="tag tag-yellow">샘플 미리보기</span>
            <label htmlFor="mypage-score-preview">점수 미리보기</label>
          </div>
          <div className="score-preview-controls">
            <input
              id="mypage-score-preview"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={preview}
              aria-describedby="mypage-score-preview-help"
              aria-invalid={outOfRange}
              onChange={(e) => setPreview(e.target.value)}
            />
            <button
              type="button"
              className="text-button"
              disabled={preview === String(average)}
              onClick={() => setPreview(String(average))}
            >
              평균으로 되돌리기
            </button>
          </div>
          <p id="mypage-score-preview-help" className="field-help">
            {outOfRange
              ? '0부터 100 사이로 맞춰서 보여 드려요.'
              : '아직 서버와 연결되기 전이라, 숫자를 바꿔 게이지가 차오르고 줄어드는 모습을 미리 볼 수 있어요.'}
          </p>
        </div>
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
