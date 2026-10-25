import { useEffect, useState } from 'react'
import { Button, Icon, Stepper } from '../jjabary/components'

export default function Analysis({ form, mode, navigate, request, onRetry }) {
  const [previewStep, setStep] = useState(0)
  const [readFailed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const speech = mode==='speech'
  const step = speech ? previewStep : request.status === 'success' ? 3 : request.status === 'loading' ? 1 : 0
  const failed = speech ? readFailed : request.status === 'error'
  const empty = speech ? !form.audio && !form.script.trim() : !form.file && !form.script.trim()
  useEffect(()=>{
    if (!speech) return
    let cancelled=false
    let timers=[]
    async function run(){
      try {
        const file=speech?form.audio:form.file
        if(file instanceof Blob) await file.slice(0,1024).arrayBuffer()
        if(cancelled)return
        timers=[setTimeout(()=>setStep(1),850),setTimeout(()=>setStep(2),1800),setTimeout(()=>setStep(3),2900)]
      } catch {if(!cancelled)setFailed(true)}
    }
    run()
    return()=>{cancelled=true;timers.forEach(clearTimeout)}
  },[attempt,form.file,form.audio,speech])
  const labels=speech?['음성 자료 확인','대본·음성 비교 화면 준비','예시 피드백 구성']:['분석 요청 준비','자료 전송 및 서버 분석','피드백 수신 완료']
  if(empty)return <div className="state-page"><div className="state-icon"><Icon name="file" size={32}/></div><span className="section-kicker">NO MATERIALS YET</span><h1>아직 확인할 자료가 없어요.</h1><p>자료나 대본을 넣어 주세요.<br/>준비된 예시 자료로 화면을 둘러볼 수도 있어요.</p><Button onClick={()=>navigate(speech?'/speech':'/materials')}>입력 화면으로 돌아가기</Button></div>
  if(failed)return <div className="state-page"><div className="state-icon"><Icon name="alert" size={32}/></div><h1>분석을 완료하지 못했어요.</h1><p role="alert">{speech ? '파일을 읽지 못했어요. 파일을 다시 선택해 주세요.' : request.error}</p><div className="hero-actions"><Button onClick={()=>{if (!speech) { onRetry(); return }; setFailed(false);setStep(0);setAttempt(a=>a+1)}}>다시 시도</Button><Button variant="outline" onClick={()=>navigate(speech?'/speech':'/materials')}>입력 화면으로</Button></div></div>
  return <div className="analysis-page section-wrap"><Stepper current={step===3?3:2}/><div className={`analysis-symbol ${step===3?'finished':''}`}><Icon name={step===3?'check':'sparkle'} size={45}/><i/><i/></div><span className="section-kicker">{step===3?'READY FOR YOUR NEXT STEP.':'A LITTLE CLARITY IS ON THE WAY.'}</span><h1>{step===3?'피드백을 만날 준비가 됐어요.':'더 나은 발표를 위한 준비 중.'}</h1><p>{step===3?'어디부터 다듬으면 좋을지, 함께 확인해 보세요.':speech ? '잠시만 기다려 주세요. 예시 분석 과정을 체험하고 있어요.' : '분석 서버의 응답을 기다리고 있어요. 잠시만 기다려 주세요.'}</p><div className="analysis-card"><div className="analysis-file"><Icon name={speech?'mic':'file'} size={24}/><div><b>{(speech?form.audio:form.file)?.name||'직접 입력한 대본'}</b><small>{speech ? '음성 피드백 · 기능 미리보기' : request.mock ? '예시 자료 · 서버 샘플 분석' : '발표자료 · 서버 분석'}</small></div></div><div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={step===3?100:undefined} aria-label="분석 진행 상태"><i style={{width:`${step===3?100:step*33+7}%`}}/></div><ol className="analysis-steps">{labels.map((label,i)=><li key={label} className={step>i?'done':step===i?'running':''}><span>{step>i?<Icon name="check" size={15}/>:String(i+1).padStart(2,'0')}</span>{label}<small>{step>i?'완료':step===i?'진행 중':'대기'}</small></li>)}</ol></div><div aria-live="polite" className="sr-only">{step===3?'피드백 준비가 완료되었습니다.':labels[step]}</div>{step===3?<Button variant="yellow" onClick={()=>navigate(speech?'/speech-results':'/results')}>피드백 결과 보기</Button>:<button className="text-button" onClick={()=>navigate(speech?'/speech':'/materials')}>입력 화면으로 돌아가기</button>}</div>
}
