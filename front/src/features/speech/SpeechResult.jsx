import { useEffect, useMemo, useState } from 'react'
import Icon from '../../components/ui/Icon.jsx'
import { annotateTranscript, LEVELS } from './annotateTranscript.js'

const WAIT_MESSAGES = [
  '발음을 꼼꼼히 듣고 있어요.',
  '단어마다 또렷하게 들리는지 확인하고 있어요.',
  '말의 자연스러움을 살펴보고 있어요.',
  '거의 다 됐어요. 조금만 기다려 주세요.',
]

const SCORE_LABELS = [
  ['pronunciation', '종합'],
  ['accuracy', '정확도'],
  ['fluency', '유창성'],
  ['completeness', '완성도'],
]

const ERROR_LABELS = {
  Mispronunciation: '발음 확인',
  Omission: '빠진 단어',
  Insertion: '끼어든 단어',
  UnexpectedBreak: '부자연스러운 끊김',
  MissingBreak: '쉼 부족',
  Monotone: '단조로운 억양',
}

const formatTime = (seconds) => {
  if (seconds == null) return ''
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const grade = (score) => (score >= 80 ? 'good' : score >= 60 ? 'fair' : 'low')

export function TranscriptPanel({ stt, pronunciation }) {
  const rows = useMemo(
    () => annotateTranscript(stt, pronunciation.status === 'success' ? pronunciation.data : null),
    [stt, pronunciation],
  )
  const colored = pronunciation.status === 'success'
  return (
    <section className="speech-panel" aria-labelledby="speech-transcript">
      <div className="card-label">
        <Icon name="mic" size={18} />
        음성 인식 결과
      </div>
      <h2 id="speech-transcript">내가 말한 내용이에요.</h2>
      {stt.text ? (
        <>
          <div className="transcript-legend" aria-label="색 설명">
            {colored ? (
              LEVELS.map((level) => (
                <span key={level.id} className={`legend-item lv-${level.id}`}>
                  {level.label}
                </span>
              ))
            ) : pronunciation.status === 'error' ? (
              <span className="muted">발음 평가를 불러오지 못해 색 표시는 없어요.</span>
            ) : (
              <span className="muted">발음 평가가 끝나면 단어마다 색으로 표시돼요.</span>
            )}
            {stt.pauses.length > 0 && <span className="legend-item pause-chip">쉬는 구간</span>}
          </div>
          <ol className="transcript-list">
            {rows.map((row, index) =>
              row.type === 'pause' ? (
                <li key={`p${index}`} className="pause-row">
                  <span className={`pause-chip${row.duration >= 2 ? ' long' : ''}`}>
                    쉼 {row.duration.toFixed(1)}초
                  </span>
                </li>
              ) : (
                <li key={`${row.start}-${index}`}>
                  <time>{formatTime(row.start)}</time>
                  <p>
                    {row.items.map((item, itemIndex) => (
                      <span
                        key={itemIndex}
                        className={item.level ? `word lv-${item.level}` : 'word'}
                        tabIndex={item.accuracy != null ? 0 : undefined}
                        data-tip={
                          item.accuracy != null
                            ? `발음 ${Math.round(item.accuracy)}점${item.errorType !== 'None' ? ` · ${ERROR_LABELS[item.errorType] || item.errorType}` : ''}`
                            : undefined
                        }
                      >
                        {item.text}{' '}
                      </span>
                    ))}
                  </p>
                </li>
              ),
            )}
          </ol>
        </>
      ) : (
        <p className="transcript-text muted">인식된 말이 없어요. 음성을 다시 확인해 주세요.</p>
      )}
    </section>
  )
}

export function DeliveryPanel({ stt }) {
  const pauseTotal = stt.pauses.reduce((sum, pause) => sum + pause.duration, 0)
  const items = [
    stt.speechRate != null && {
      label: '말하기 속도',
      value: `분당 ${Math.round(stt.speechRate)}자`,
      note: stt.speechRateScore != null ? `속도 점수 ${Math.round(stt.speechRateScore)}점` : '',
    },
    stt.duration != null && { label: '음성 길이', value: formatTime(stt.duration), note: '' },
    {
      label: '쉬는 구간',
      value: `${stt.pauses.length}번`,
      note: stt.pauses.length ? `합계 ${pauseTotal.toFixed(1)}초` : '길게 쉬는 구간이 없어요.',
    },
  ].filter(Boolean)
  return (
    <section className="speech-panel" aria-labelledby="speech-delivery">
      <div className="card-label">
        <Icon name="clock" size={18} />
        전달 속도
      </div>
      <h2 id="speech-delivery">속도와 쉼을 살펴봤어요.</h2>
      <div className="speech-metrics">
        {items.map((item) => (
          <div key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            {item.note && <span>{item.note}</span>}
          </div>
        ))}
      </div>
    </section>
  )
}

function PronunciationWaiting() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setIndex((value) => (value + 1) % WAIT_MESSAGES.length), 3500)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="pron-waiting" role="status">
      <div className="speech-skeleton" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <p key={index} className="fade-text">
        {WAIT_MESSAGES[index]}
      </p>
    </div>
  )
}

export function PronunciationPanel({ pronunciation, onRetry }) {
  const { status, data, error } = pronunciation
  return (
    <section
      className="speech-panel"
      aria-labelledby="speech-pron"
      aria-busy={status === 'loading'}
    >
      <div className="card-label">
        <Icon name="sparkle" size={18} />
        발음 평가
      </div>
      <h2 id="speech-pron">발음은 이렇게 들렸어요.</h2>
      {(status === 'idle' || status === 'loading') && <PronunciationWaiting />}
      {status === 'error' && (
        <div className="pron-error" role="alert">
          <p>{error}</p>
          <p className="muted">음성 인식 결과와 말하기 속도는 위에서 그대로 확인할 수 있어요.</p>
          <button type="button" className="text-button" onClick={onRetry}>
            발음 평가 다시 시도
          </button>
        </div>
      )}
      {status === 'success' && (
        <>
          <div className="pron-scores">
            {SCORE_LABELS.map(([key, label]) =>
              data.scores[key] == null ? null : (
                <div key={key} className={`pron-score ${grade(data.scores[key])}`}>
                  <small>{label}</small>
                  <strong>{Math.round(data.scores[key])}</strong>
                </div>
              ),
            )}
          </div>
          <p className="muted pron-hint">
            단어별 결과는 위 ‘음성 인식 결과’에 색으로 표시했어요. 단어에 마우스를 올리면 점수를 볼
            수 있어요.
          </p>
        </>
      )}
    </section>
  )
}
