import { useEffect, useRef, useState } from 'react'
import { Button, Icon, Stepper, Upload } from '../jjabary/components'
import { example } from '../jjabary/data'

export default function FeedbackForm({ mode, form, setForm, navigate, start }) {
  const speech = mode === 'speech'
  const [scriptMode, setScriptMode] = useState('text')
  const [scriptFile, setScriptFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [audioUrl, setAudioUrl] = useState('')
  const purposeRef = useRef(null)
  useEffect(() => {
    if (!(form.audio instanceof Blob)) return
    const url = URL.createObjectURL(form.audio)
    setAudioUrl(url)
    return () => { URL.revokeObjectURL(url); setAudioUrl('') }
  }, [form.audio])
  const update = (field, value) => { setForm(f => ({ ...f, [field]: value })); setErrors(e => ({ ...e, [field]: '', ...(field === 'script' ? { file: '' } : {}) })) }
  const error = key => value => setErrors(e => ({ ...e, [key]: value }))
  async function readScript(file) {
    setScriptFile(file)
    if (!file) { update('script', ''); return }
    try { const text = await file.text(); if (text.length > 50000) { error('script')('대본은 50,000자 이내로 입력해 주세요.'); setScriptFile(null); return }; update('script', text) } catch { error('script')('파일을 읽지 못했어요. 다시 선택하거나 직접 입력해 주세요.'); setScriptFile(null) }
  }
  function submit(e) {
    e.preventDefault()
    if (!form.purpose.trim()) { error('purpose')('발표 목적을 입력해 주세요.'); purposeRef.current.focus(); return }
    if (!speech && !form.file && !form.script.trim()) { error('file')('발표자료를 선택하거나 대본을 입력해 주세요.'); return }
    if (Object.entries(errors).some(([key, value]) => value && key !== 'file')) return
    if (errors.file && form.file) return
    start(mode)
  }
  function fillExample() { setForm({ ...example, audio: speech ? { name: '리허설_1차.m4a', size: 4823449, sample: true } : null }); setErrors({}); setScriptFile(null) }
  return <div className="workspace-page section-wrap"><button className="back-link" onClick={() => navigate('/')}><Icon name="back" size={16} />홈으로</button><Stepper /><div className="page-heading"><div><span className="section-kicker">{speech ? 'PRACTICE. REFLECT. REPEAT.' : 'A STRONGER STORY STARTS HERE.'}</span><h1>{speech ? '말에 자신감을 더해 보세요.' : '어떤 발표를 준비하고 있나요?'}</h1><p>{speech ? '대본과 리허설 음성을 준비하고, 전달 방식을 돌아보세요.' : '발표의 목적을 알려 주시면, 자료를 바라보는 기준이 생겨요.'}</p></div><button className="text-button example-fill" onClick={fillExample}><Icon name="sparkle" size={16} />예시 자료로 채우기</button></div>
    <div className="form-layout"><form onSubmit={submit} noValidate>
      <section className="form-section"><div className="form-section-title"><span>01</span><h2>발표 이야기</h2><small><i>*</i> 필수 입력</small></div><div className="field"><label htmlFor="purpose">발표 목적 <i>*</i></label><input ref={purposeRef} id="purpose" maxLength={300} value={form.purpose} onChange={e=>update('purpose',e.target.value)} placeholder="예: 신입 사원에게 하반기 로드맵을 10분 안에 소개" aria-required="true" aria-invalid={!!errors.purpose} aria-describedby={errors.purpose ? 'purpose-error' : 'purpose-help'} />{errors.purpose ? <p id="purpose-error" role="alert" className="field-error">{errors.purpose}</p> : <p id="purpose-help" className="field-help">누구에게, 무엇을, 얼마나 오래 이야기하나요?</p>}</div><div className="field"><label htmlFor="title">발표 제목 <span>선택</span></label><input id="title" maxLength={120} value={form.title} onChange={e=>update('title',e.target.value)} placeholder="발표의 이름을 적어 주세요" /></div><div className="field"><label htmlFor="description">추가 설명 <span>선택</span></label><textarea id="description" rows={3} maxLength={3000} value={form.description} onChange={e=>update('description',e.target.value)} placeholder="발표 장소, 청중의 배경, 특히 신경 쓰이는 부분이 있나요?" /></div></section>
      {!speech && <section className="form-section"><div className="form-section-title"><span>02</span><h2>발표자료</h2></div><Upload file={form.file} onFile={f=>update('file',f)} error={errors.file} setError={error('file')} /><p className="privacy-note"><Icon name="shield" size={13}/>분석 시작 시 선택한 발표자료가 분석 서버로 전송됩니다.</p></section>}
      <section className="form-section"><div className="form-section-title"><span>{speech?'02':'03'}</span><h2>발표 대본</h2><small>선택</small></div><p className="section-description">준비한 대본이 있다면 함께 넣어 주세요.</p><div className="segmented" role="group" aria-label="대본 입력 방식"><button type="button" aria-pressed={scriptMode==='text'} className={scriptMode==='text'?'active':''} onClick={()=>setScriptMode('text')}><Icon name="edit" size={15}/>직접 입력</button><button type="button" aria-pressed={scriptMode==='file'} className={scriptMode==='file'?'active':''} onClick={()=>setScriptMode('file')}><Icon name="upload" size={15}/>TXT 업로드</button></div>{scriptMode==='text'?<div className="script-input"><textarea aria-label="발표 대본" maxLength={50000} rows={6} value={form.script} onChange={e=>update('script',e.target.value)} placeholder="안녕하세요. 오늘은…"/><span>{form.script.length.toLocaleString()} / 50,000자</span></div>:<Upload kind="script" file={scriptFile} onFile={readScript} error={errors.script} setError={error('script')}/>}</section>
      <section className="form-section"><div className="form-section-title"><span>{speech?'03':'04'}</span><h2>리허설 음성</h2><span className="tag tag-muted">준비 중</span></div><p className="section-description">음성 피드백의 입력 화면을 미리 체험해 보세요.</p><Upload kind="audio" file={form.audio} onFile={f=>update('audio',f)} error={errors.audio} setError={error('audio')}/>{audioUrl&&<audio controls src={audioUrl} className="audio-player" aria-label="선택한 리허설 음성 재생"/>}</section>
      <div className="demo-notice"><Icon name="info" size={19}/><p><strong>{speech ? '음성 피드백은 기능 미리보기입니다.' : form.file?.sample ? '예시 자료로 분석 흐름을 체험합니다.' : '입력한 자료로 분석을 요청합니다.'}</strong><br/>{speech ? '음성 분석 API는 아직 제공되지 않아 준비된 예시 결과를 보여 드려요.' : form.file?.sample ? '서버의 샘플 결과를 표시합니다. 실제 파일을 선택하면 해당 자료로 분석을 요청합니다.' : '발표 정보·대본·선택한 발표자료를 분석 서버에 전송합니다. 리허설 음성은 전송하지 않습니다.'}</p></div><div className="form-actions"><button type="button" className="text-button" onClick={()=>navigate('/')}>취소</button><Button variant="yellow" type="submit" icon="sparkle">{speech?'피드백 미리보기':form.file?.sample?'예시 분석 시작':'분석 시작'}</Button></div>
    </form><aside className="form-sidebar"><div className="side-note"><span className="side-note-icon"><Icon name="sparkle" size={24}/></span><h3>좋은 질문이,<br/>좋은 피드백을 만들어요.</h3><p>발표의 맥락이 구체적일수록<br/>더 적절한 제안을 할 수 있어요.</p><div className="tip-example"><small>이렇게 적어 보세요</small><p>“팀원 10명에게 신규 기능을<br/>소개하고, 개발 우선순위에<br/>대한 의견을 받고 싶어요.”</p></div><div className="side-checks"><strong>확인하게 될 내용</strong>{(speech?['대본과 음성 비교','발음·전달 피드백','다음 연습을 위한 제안']:['발표 목적에 따른 종합 피드백','100점 기준의 발표 점수','잘한 점과 구체적인 개선사항','피드백 보고서 다운로드']).map(t=><span key={t}><Icon name="check" size={15}/>{t}</span>)}</div></div><div className="side-bottom"><Icon name="shield" size={19}/><p>부담 없이 먼저 둘러보세요.<br/><button onClick={fillExample}>예시 자료로 시작하기 <span>↗</span></button></p></div></aside></div>
  </div>
}
