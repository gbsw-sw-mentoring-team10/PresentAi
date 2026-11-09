export default function PresentationFields({ form, purposeError, onChange, purposeRef }) {
  return (
    <section className="form-section">
      <div className="form-section-title">
        <span>01</span>
        <h2>발표 이야기</h2>
        <small>
          <i>*</i> 필수 입력
        </small>
      </div>
      <div className="field">
        <label htmlFor="purpose">
          발표 목적 <i>*</i>
        </label>
        <input
          ref={purposeRef}
          id="purpose"
          maxLength={300}
          value={form.purpose}
          onChange={(e) => onChange('purpose', e.target.value)}
          placeholder="예: 신입 사원에게 하반기 로드맵을 10분 안에 소개"
          aria-required="true"
          aria-invalid={!!purposeError}
          aria-describedby={purposeError ? 'purpose-error' : 'purpose-help'}
        />
        {purposeError ? (
          <p id="purpose-error" role="alert" className="field-error">
            {purposeError}
          </p>
        ) : (
          <p id="purpose-help" className="field-help">
            누구에게, 무엇을, 얼마나 오래 이야기하나요?
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="title">
          발표 제목 <span>선택</span>
        </label>
        <input
          id="title"
          maxLength={120}
          value={form.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="발표의 이름을 적어 주세요"
        />
      </div>
      <div className="field">
        <label htmlFor="description">
          추가 설명 <span>선택</span>
        </label>
        <textarea
          id="description"
          rows={3}
          maxLength={3000}
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="발표 장소, 청중의 배경, 특히 신경 쓰이는 부분이 있나요?"
        />
      </div>
    </section>
  )
}
