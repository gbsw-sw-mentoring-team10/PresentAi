import { useState } from 'react'
import { Button, Icon, Stepper } from '../jjabary/components'

export default function ApiResults({ request, navigate }) {
  const { result, submission, mock } = request
  const [resolved, setResolved] = useState([])
  const [toast, setToast] = useState('')
  function toggle(index) { setResolved(items => items.includes(index) ? items.filter(item => item !== index) : [...items, index]) }
  function exportReport() {
    const text = `PresentAi — ${mock ? '서버 샘플' : '발표'} 피드백 보고서\n\n발표 제목: ${submission.title}\n발표 목적: ${submission.purpose}\n점수: ${result.score} / 100\n\n종합 피드백\n${result.feedback}\n\n장점\n${result.strengths.map(item => `• ${item}`).join('\n')}\n\n개선사항\n${result.improvements.map(item => `• ${item.deduction != null ? `[감점 ${item.deduction}점] ` : ''}${item.issue}${item.solution ? `\n  → 해결 방법: ${item.solution}` : ''}`).join('\n')}${result.revised_script ? `\n\n수정된 대본\n${result.revised_script}` : ''}${mock ? '\n\n이 보고서는 예시 자료에 대한 서버 샘플 응답입니다.' : ''}`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = 'presentai-feedback.txt'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setToast('피드백 보고서를 내려받았어요.')
    setTimeout(() => setToast(''), 3500)
  }
  return <div className="results-page section-wrap">
    <div className="result-topline"><button className="back-link" onClick={() => navigate('/materials')}><Icon name="back" size={16} />입력 화면으로</button><Stepper current={3} /></div>
    <div className="page-heading"><div><span className="section-kicker">A CLEARER STORY. A STRONGER YOU.</span><h1>좋은 발표에 한 걸음 더 가까이.</h1><p>지금 잘하고 있는 것부터, 더 다듬으면 좋을 부분까지.</p></div><Button variant="outline" icon="download" onClick={exportReport}>보고서 받기</Button></div>
    {mock && <div className="example-banner"><span className="tag tag-yellow">서버 샘플 결과</span><p>예시 자료 체험용으로 서버가 반환한 샘플입니다. 입력한 내용의 실제 분석 결과가 아닙니다.</p></div>}
    <div className="result-meta"><div><small>발표 제목</small><strong>{submission.title}</strong></div><div><small>발표 목적</small><span>{submission.purpose}</span></div><div><small>분석 자료</small><span><Icon name="file" size={16} />{submission.file?.name || '직접 입력한 대본'}</span></div></div>
    <div className="overview-grid"><section className="summary-card"><div className="card-label"><Icon name="sparkle" size={18} />전체 피드백</div><h2>발표를 돌아보고,<br /><mark>다음 방향을 찾아보세요.</mark></h2><p className="api-feedback-text">{result.feedback}</p></section><section className="time-card"><div className="card-label"><Icon name="check" size={18} />발표 평가</div><h2>{result.score}<span> / 100</span></h2><p>서버에서 반환한 발표 점수입니다.</p></section></div>
    <section className="priority-section"><div className="subheading"><h2>이런 점이 좋았어요.</h2><span>{result.strengths.length}개 장점</span></div><div className="priority-list">{result.strengths.map((item, index) => <article key={index}><span className="file-ok"><Icon name="check" size={18} /></span><div><span className="priority-label">장점 {index + 1}</span><p className="api-feedback-text">{item}</p></div></article>)}{!result.strengths.length && <p>서버가 별도의 장점을 반환하지 않았습니다.</p>}</div></section>
    <section className="priority-section"><div className="subheading"><h2>하나씩 다듬어 보세요.</h2><span>{resolved.length} / {result.improvements.length} 확인 완료</span></div><div className="priority-list">{result.improvements.map((item, index) => <article className={resolved.includes(index) ? 'resolved' : ''} key={index}><button className="resolve-check" aria-label={`개선사항 ${index + 1} 확인 완료 표시`} aria-pressed={resolved.includes(index)} onClick={() => toggle(index)}>{resolved.includes(index) ? <Icon name="check" size={16} /> : String(index + 1).padStart(2, '0')}</button><div><div className="priority-meta"><span className="priority-label">수정 제안 {index + 1}</span>{item.deduction != null && <strong className="penalty-score">감점 {item.deduction}점</strong>}</div><p className="api-feedback-text">{item.issue}</p>{item.solution && <div className="api-solution"><small>해결 방법</small><p className="api-feedback-text">{item.solution}</p></div>}</div></article>)}{!result.improvements.length && <p>서버가 별도의 개선사항을 반환하지 않았습니다.</p>}</div></section>
    {result.revised_script && <section className="priority-section"><div className="subheading"><h2>피드백을 반영해 다듬은 대본이에요.</h2></div><pre className="revised-script">{result.revised_script}</pre></section>}
    <div className="result-bottom-cta"><div><span>한 번의 점검, 더 나은 한 번의 발표.</span><h3>다음 자료도 함께 다듬어 볼까요?</h3></div><Button variant="yellow" onClick={() => navigate('/materials')}>다른 자료 점검하기</Button></div>
    {toast && <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div>}
  </div>
}
