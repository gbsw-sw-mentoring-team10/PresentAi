import { useLayoutEffect, useRef, useState } from 'react'
import { Button, Icon, SlideArtwork, Stepper } from '../jjabary/components'
import { example, slides, priorities } from '../jjabary/data'

export default function Results({ navigate, speech = false }) {
  const [tab, setTab] = useState('overview')
  const [selected, setSelected] = useState(3)
  const [filter, setFilter] = useState('all')
  const [resolved, setResolved] = useState([])
  const [toast, setToast] = useState('')
  const tabsRef = useRef(null)
  const slidesRef = useRef(null)
  const pendingDetailScroll = useRef(false)
  useLayoutEffect(() => {
    // Reveal the selected item without moving the whole page vertically.
    for (const list of [tabsRef.current, slidesRef.current]) {
      const item = list?.querySelector('[aria-selected="true"], [aria-current="true"]')
      if (!item || list.scrollWidth <= list.clientWidth) continue
      const bounds = list.getBoundingClientRect()
      const itemBounds = item.getBoundingClientRect()
      if (itemBounds.left < bounds.left || itemBounds.right > bounds.right) {
        list.scrollLeft += itemBounds.left - bounds.left - (list.clientWidth - itemBounds.width) / 2
      }
    }
    if (pendingDetailScroll.current && tabsRef.current) {
      pendingDetailScroll.current = false
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: window.scrollY + tabsRef.current.getBoundingClientRect().top - 90, behavior: reduced ? 'instant' : 'smooth' })
    }
  }, [tab, selected, filter])
  const slide = slides.find(s => s.id === selected)
  function toggle(id) { setResolved(x => x.includes(id) ? x.filter(v => v !== id) : [...x, id]) }
  function openSlide(id) { pendingDetailScroll.current = true; setSelected(id); setTab('slides') }
  function exportReport() {
    const text = `PRESENTLY — 예시 피드백 보고서\n실제 제출 자료의 AI 분석 결과가 아닌 데모입니다.\n\n${example.title}\n발표 목적: ${example.purpose}\n\n${speech ? '대본과 음성 비교는 준비 중인 기능입니다. 예시 개선 제안: 빠진 연결 문장을 확인하고, 긴 문장을 짧게 나눠 연습하세요.' : slides.map(s => `슬라이드 ${s.id}: ${s.title}\n권장 시간: ${s.time}\n${s.issue}\n수정 제안: ${s.suggestion}\n`).join('\n')}`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'presentai-example-feedback.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setToast('예시 피드백 보고서를 내려받았어요.'); setTimeout(() => setToast(''), 3500)
  }
  const tabs = [{ id: 'overview', name: '전체 요약', icon: 'grid' }, { id: 'slides', name: '슬라이드별 피드백', icon: 'slides' }, { id: 'flow', name: '논리와 흐름', icon: 'flow' }, { id: 'facts', name: '정보 확인', icon: 'shield' }]
  return <div className="results-page section-wrap">
    <div className="result-topline"><button className="back-link" onClick={() => navigate(speech ? '/speech' : '/materials')}><Icon name="back" size={16} />입력 화면으로</button><Stepper current={3} /></div>
    <div className="page-heading"><div><span className="section-kicker">A CLEARER STORY. A STRONGER YOU.</span><h1>{speech ? '말을 돌아보면, 전달이 달라져요.' : '좋은 발표에 한 걸음 더 가까이.'}</h1><p>{speech ? '대본과 리허설을 비교하고, 다음 연습의 방향을 찾아보세요.' : '지금 잘하고 있는 것부터, 더 다듬으면 좋을 부분까지.'}</p></div><Button variant="outline" icon="download" onClick={exportReport}>보고서 받기</Button></div>
    <div className="example-banner"><span className="tag tag-yellow">예시 결과</span><p>아래 내용은 <b>‘2026 하반기 서비스 로드맵’</b> 예시 자료의 피드백입니다. 선택한 파일의 실제 분석 결과가 아닙니다.</p></div>
    <div className="result-meta"><div><small>발표 제목</small><strong>{example.title}</strong></div><div><small>발표 목적</small><span>{example.purpose}</span></div><div><small>{speech ? '예시 음성' : '예시 자료'}</small><span><Icon name={speech ? 'mic' : 'file'} size={16} />{speech ? '리허설_1차.m4a' : example.file.name}</span></div></div>
    {speech ? <SpeechResults /> : <>
      <div ref={tabsRef} className="result-tabs" role="tablist" aria-label="피드백 종류">{tabs.map(t => <button role="tab" id={`tab-${t.id}`} aria-controls="result-panel" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const ids = tabs.map(t => t.id); const next = ids[(ids.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : 3)) % 4]; setTab(next); document.getElementById(`tab-${next}`)?.focus() } }} key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}><Icon name={t.icon} size={17} />{t.name}{t.id === 'facts' && <span>1</span>}</button>)}</div>
      <div id="result-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className="result-panel">
        {tab === 'overview' && <>
          <div className="overview-grid"><section className="summary-card"><div className="card-label"><Icon name="sparkle" size={18} />전체 피드백</div><h2>흐름은 좋아요.<br /><mark>핵심을 더 선명하게</mark> 만들어 봐요.</h2><p>현황에서 계획, 실행으로 이어지는 구조가 자연스러워요. 신입 사원의 눈높이에 맞춰 전문 용어를 풀고, 핵심 지표를 강조하면 더 이해하기 쉬운 발표가 됩니다.</p><div className="summary-chips"><span><Icon name="check" size={14} />명확한 발표 주제</span><span><Icon name="check" size={14} />자연스러운 전개</span></div></section><section className="time-card"><div className="card-label"><Icon name="clock" size={18} />권장 발표 시간</div><h2>10<span>분</span></h2><p>6장의 슬라이드, 균형 있는 전달</p><div className="time-bars">{slides.map((s, i) => <button key={s.id} aria-label={`${s.id}번 슬라이드 ${s.time}`} onClick={() => openSlide(s.id)} style={{ height: [24, 46, 65, 83, 65, 46][i] }}><span>{s.id}</span></button>)}</div><small>내용과 청중에 맞춰 조정해 주세요.</small></section></div>
          <section className="priority-section"><div className="subheading"><h2>먼저, 이 세 가지만 다듬어 보세요.</h2><span>{priorities.filter(p => resolved.includes(p.id)).length} / 3 확인 완료</span></div><div className="priority-list">{priorities.map((p, i) => <article className={resolved.includes(p.id) ? 'resolved' : ''} key={p.id}><button className="resolve-check" aria-label={`${p.title} 확인 완료 표시`} aria-pressed={resolved.includes(p.id)} onClick={() => toggle(p.id)}>{resolved.includes(p.id) ? <Icon name="check" size={16} /> : String(i + 1).padStart(2, '0')}</button><div><span className={`priority-label ${i === 0 ? 'urgent' : ''}`}>{p.level} · SLIDE 0{p.slide}</span><h3>{p.title}</h3><p>{p.text}</p></div><button className="icon-button" aria-label={`${p.slide}번 슬라이드 피드백 보기`} onClick={() => openSlide(p.slide)}><Icon name="arrow" /></button></article>)}</div></section>
          <div className="subheading"><h2>슬라이드마다, 더 구체적으로.</h2><button className="text-button" onClick={() => setTab('slides')}>모두 보기<Icon name="arrow" size={16} /></button></div><div className="slide-grid">{slides.slice(0, 3).map(s => <button className="slide-preview-card" key={s.id} onClick={() => openSlide(s.id)}><SlideArtwork slide={s} small /><div><span>0{s.id} · {s.category}</span><span className={`status-tag ${s.status === '우선 수정' ? 'urgent' : ''}`}>{s.status}</span></div><h3>{s.title}</h3><small><Icon name="clock" size={13} />{s.time}</small></button>)}</div>
        </>}
        {tab === 'slides' && <div className="slides-detail-layout"><aside ref={slidesRef} className="slides-list" aria-label="슬라이드 선택"><div className="slides-filter"><label htmlFor="slide-filter">슬라이드 <b>06</b></label><select id="slide-filter" value={filter} onChange={e => { const next = e.target.value; setFilter(next); if (next === 'review' && slide.status === '좋아요') setSelected(2) }}><option value="all">전체 보기</option><option value="review">수정 필요</option></select></div>{slides.filter(s => filter === 'all' || s.status !== '좋아요').map(s => <button aria-current={selected === s.id ? 'true' : undefined} aria-label={`${s.id}번 ${s.title} · ${s.status}`} className={selected === s.id ? 'selected' : ''} key={s.id} onClick={() => setSelected(s.id)}><span className="slide-list-number">0{s.id}</span><div><SlideArtwork slide={s} small /><b>{s.title}</b><small>{s.status}</small></div></button>)}</aside><section className="slide-detail"><div className="slide-detail-heading"><h2>0{slide.id} <span>{slide.title}</span></h2><span className="tag tag-yellow"><Icon name="clock" size={14} />{slide.time}</span></div><SlideArtwork slide={slide} /><p className="slide-summary">{slide.summary}</p><div className="feedback-block positive"><span><Icon name="check" size={18} /></span><div><h3>잘하고 있어요</h3><p>{slide.good}</p></div></div><div className="feedback-block"><span><Icon name="edit" size={18} /></span><div><h3>이 부분을 다듬어 보세요</h3><p>{slide.issue}</p></div></div><div className="recommendation"><span className="card-label"><Icon name="sparkle" size={16} />이렇게 바꿔 보세요</span><p>{slide.suggestion}</p></div><div className="slide-navigation"><Button variant="outline" icon="back" disabled={selected === 1} onClick={() => { setFilter('all'); setSelected(s => s - 1) }}>이전</Button><span>{selected} / {slides.length}</span><Button disabled={selected === 6} onClick={() => { setFilter('all'); setSelected(s => s + 1) }}>다음 슬라이드</Button></div></section></div>}
        {tab === 'flow' && <div className="flow-panel"><div className="section-intro"><span className="section-kicker">CONNECT THE DOTS.</span><h2>각 장이, 하나의 이야기로.</h2><p>전체 흐름은 자연스러워요. 청중이 다음 이야기를 예상할 수 있도록 연결 문장을 더해 보세요.</p></div><div className="flow-diagram">{['주제 소개', '현황과 기회', '실행 계획', '역할과 다음 단계'].map((x, i) => <div key={x}><span>0{i + 1}</span><b>{x}</b><small>{['SLIDE 01', 'SLIDE 02–03', 'SLIDE 04', 'SLIDE 05–06'][i]}</small>{i < 3 && <Icon name="arrow" size={17} />}</div>)}</div><div className="flow-cards"><article><Icon name="check" /><h3>목적과의 연관성</h3><p>신입 사원에게 서비스의 방향을 소개한다는 목적에 잘 맞아요. 현황과 계획, 역할을 차례로 설명하는 구성이 도움이 됩니다.</p></article><article><Icon name="plus" /><h3>더하면 좋은 내용</h3><p>시장 분석 앞에 용어 설명을, 마지막에는 로드맵 문서와 질문 채널을 추가해 보세요.</p></article></div><div className="recommendation"><span className="card-label">SLIDE 03 → 04 · 연결 문장 제안</span><p>“이 기회를 실제 변화로 만들기 위해, 하반기에는 세 단계로 움직이겠습니다.”</p></div></div>}
        {tab === 'facts' && <section className="facts-panel"><div className="section-intro"><span className="section-kicker">BUILD TRUST, ONE DETAIL AT A TIME.</span><h2>좋은 주장에는, 분명한 근거가.</h2><p>아래 항목은 사실 오류의 확정이 아니라, 발표 전에 확인하면 좋은 정보예요.</p></div><article className="fact-item"><div><span className="tag tag-yellow"><Icon name="alert" size={14} />출처 확인 필요</span><span>SLIDE 03</span></div><h3>시장 규모와 성장률의 출처를 확인해 주세요.</h3><p>예시 슬라이드의 시장 수치에는 출처와 조사 시점이 표시되어 있지 않아요. 원문 자료에서 수치의 정의, 대상, 기준 연도를 확인한 뒤 각주를 추가해 보세요.</p><div className="fact-checklist">{['원문 보고서 또는 공식 자료 확인', '조사 시점과 수치의 기준 확인', '슬라이드에 출처·기준 연도 표시'].map((t, i) => <label key={t}><input type="checkbox" checked={resolved.includes(`fact-${i}`)} onChange={() => toggle(`fact-${i}`)} />{t}</label>)}</div><button className="text-button" onClick={() => openSlide(3)}>해당 슬라이드 보기<Icon name="arrow" size={16} /></button></article></section>}
      </div>
    </>}
    <div className="result-bottom-cta"><div><span>한 번의 점검, 더 나은 한 번의 발표.</span><h3>다음 자료도 함께 다듬어 볼까요?</h3></div><Button variant="yellow" onClick={() => navigate(speech ? '/speech' : '/materials')}>{speech ? '다시 연습하기' : '다른 자료 점검하기'}</Button></div>{toast && <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div>}
  </div>
}

function SpeechResults() {
  const [showDiff, setShowDiff] = useState(true)
  return <div className="speech-results"><div className="summary-card"><div className="card-label"><Icon name="mic" size={18} />발표 피드백 · 기능 미리보기</div><h2>큰 흐름은 유지하고,<br /><mark>연결 문장은 더 자연스럽게.</mark></h2><p>예시 리허설에서는 대본의 전체 흐름이 유지되었지만, 일부 연결 문장이 달라졌어요. 의도한 변화인지 확인하고 다음 연습의 기준을 맞춰 보세요.</p></div><div className="subheading"><h2>대본과 실제 발화, 나란히 보기</h2><label className="switch-label"><input type="checkbox" checked={showDiff} onChange={e => setShowDiff(e.target.checked)} />차이 강조</label></div><div className="comparison"><div className="comparison-header"><span><Icon name="file" size={17} />준비한 대본</span><span><Icon name="mic" size={17} />음성 전사 예시</span></div>{[['저희 서비스는 발표 준비 시간을 줄이는 것을 목표로 합니다.', '저희 서비스는 발표 준비 시간을 줄이는 것을 목표로 합니다.'], ['먼저 시장 현황을 살펴보겠습니다.', '시장 현황을 살펴보겠습니다.'], ['분기별 계획은 다음과 같습니다.', '분기별 계획은 다음 슬라이드에서 말씀드리겠습니다.']].map(([a, b], i) => <div className={`comparison-row ${i > 0 && showDiff ? 'difference' : ''}`} key={a}><p><span className="comparison-label">준비한 대본</span>{a}</p><p><span className="comparison-label">음성 전사 예시</span>{b}{i > 0 && <small>{i === 1 ? '연결어 생략' : '표현 변경'}</small>}</p></div>)}</div><div className="subheading"><h2>다음 연습에서는 이렇게 해 보세요.</h2><span className="tag tag-muted">예시 제안</span></div><div className="speech-suggestions">{['달라진 연결 문장을 대본에도 반영해 보세요.', '긴 문장은 의미 단위로 나누어 말해 보세요.', '같은 구간을 다시 녹음해 변화를 확인해 보세요.'].map((t, i) => <article key={t}><span>0{i + 1}</span><h3>{t}</h3></article>)}</div><div className="demo-notice"><Icon name="info" size={20} /><p><strong>발음·전달 방식 분석은 준비 중이에요.</strong><br />음성 인식 오류만으로 발음 문제를 판단하지 않으며, 분석 기준을 검토하고 있습니다. 현재 내용은 기능 설명을 위한 예시입니다.</p></div></div>
}
