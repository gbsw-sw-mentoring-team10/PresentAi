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
          placeholder="예: 기관 투자자에게 ESG 부동산 투자 전략을 10분 안에 제안"
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
          placeholder="예: 그린 호라이즌 투자 제안서"
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
          placeholder="예: 투자 설명회에서 발표해요. 수치의 근거가 충분한지 봐 주세요."
        />
      </div>
    </section>
  )
}
