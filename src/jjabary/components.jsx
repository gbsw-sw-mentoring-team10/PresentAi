import { useEffect, useRef, useState } from 'react'

const paths = {
  arrow: 'M4 12h15m-6-6 6 6-6 6', chevron: 'm9 5 7 7-7 7', down: 'm6 9 6 6 6-6', back: 'M20 12H5m6-6-6 6 6 6',
  sparkle: 'm12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z',
  slides: 'M4 3h16v14H4V3Zm8 14v4m-4 0h8M8 8h8M8 12h5',
  mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-4 6v1a7 7 0 0 0 14 0v-1m-7 8v3m-4 0h8',
  check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M6 18 18 6', upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h6', clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  shield: 'm12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Zm-4 10 3 3 5-6',
  grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  flow: 'M4 3h6v6H4V3Zm10 12h6v6h-6v-6ZM7 9v9h7M10 6h7v9',
  alert: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v.01', download: 'M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5',
  menu: 'M4 6h16M4 12h16M4 18h16', play: 'm8 4 12 8-12 8V4Z', edit: 'm15 3 6 6-12 12H3v-6L15 3Zm-3 3 6 6',
  info: 'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', plus: 'M12 4v16M4 12h16',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3', logout: 'M9 3H3v18h6M8 12h13m-5-5 5 5-5 5',
}

export function Icon({ name, size = 20, className = '' }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.sparkle} /></svg>
}

export function Logo({ compact = false, responsive = false, className = '' }) {
  return <span role="img" aria-label="PresentAi" className={`brand-logo ${compact ? 'is-compact' : ''} ${responsive ? 'is-responsive' : ''} ${className}`}>
    <svg className="brand-full" viewBox="81 191 2012 353" aria-hidden="true"><image href="/brand/presentai-full.png" width="2172" height="724" /></svg>
    <svg className="brand-compact" viewBox="151 121 1770 598" aria-hidden="true"><image href="/brand/presentai-compact.png" width="2009" height="783" /></svg>
  </span>
}

export function Button({ children, variant = 'yellow', icon = 'arrow', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}{icon && <Icon name={icon} size={18} />}</button>
}

export function Stepper({ current = 1 }) {
  return <ol className="stepper" aria-label="피드백 진행 단계">{['자료 입력', '분석 진행', '결과 확인'].map((x, i) => <li key={x} className={i + 1 === current ? 'current' : i + 1 < current ? 'complete' : ''} aria-current={i + 1 === current ? 'step' : undefined}><span>{i + 1 < current ? <Icon name="check" size={13} /> : `0${i + 1}`}</span>{x}{i < 2 && <i />}</li>)}</ol>
}

export function SlideArtwork({ slide, small = false }) {
  return <div className={`slide-art slide-${slide.theme} ${small ? 'small' : ''}`}><div className="slide-art-top"><span>OUR NEXT CHAPTER</span><span>2026 / H2</span></div><div className="slide-art-body"><div><span className="slide-kicker">{slide.category || 'THE NEXT CHAPTER'}</span><h3>{slide.title}</h3><p>{slide.subtitle}</p></div><div className="orbit-art" aria-hidden="true"><i /><i /><i /><b /></div></div><div className="slide-art-footer"><span>make an impact.</span><span>{String(slide.id || 1).padStart(2, '0')} — 06</span></div></div>
}

export function Upload({ file, onFile, kind = 'material', error, setError }) {
  const input = useRef(null)
  const [drag, setDrag] = useState(false)
  const accepted = kind === 'audio' ? ['mp3', 'wav', 'm4a', 'ogg', 'webm'] : kind === 'script' ? ['txt'] : ['pdf', 'ppt', 'pptx', 'html', 'htm']
  const formats = kind === 'audio' ? 'MP3, WAV, M4A, OGG, WEBM' : kind === 'script' ? 'TXT' : 'PPT, PPTX, PDF, HTML'
  function choose(f) {
    if (!f) return
    if (!accepted.includes(f.name.split('.').pop().toLowerCase())) { setError(`${formats} 파일을 선택해 주세요.`); return }
    if (!f.size) { setError('비어 있는 파일입니다. 다른 파일을 선택해 주세요.'); return }
    if (f.size > 30 * 1024 * 1024) { setError('체험 버전에서는 30MB 이하의 파일을 선택할 수 있어요.'); return }
    setError(''); onFile(f)
  }
  return <div><input ref={input} className="sr-only" type="file" aria-label={`${kind === 'audio' ? '음성' : kind === 'script' ? '대본' : '발표자료'} 파일 선택`} accept={accepted.map(x => `.${x}`).join(',')} onChange={e => { choose(e.target.files[0]); e.target.value = '' }} />{file ? <div className="selected-file"><span className="file-icon"><Icon name={kind === 'audio' ? 'mic' : 'file'} size={24} /></span><div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB · {file.sample ? '예시 파일' : '파일 선택 완료'}</small></div><span className="file-ok"><Icon name="check" size={16} /></span><button className="icon-button" type="button" aria-label="선택한 파일 삭제" onClick={() => onFile(null)}><Icon name="close" size={17} /></button></div> : <button type="button" className={`upload-zone ${drag ? 'dragging' : ''} ${error ? 'invalid' : ''}`} onClick={() => input.current.click()} onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length > 1) setError('파일은 한 번에 하나씩 선택해 주세요.'); else choose(e.dataTransfer.files[0]) }}><span className="upload-icon"><Icon name="upload" size={26} /></span><strong>{kind === 'audio' ? '리허설 음성을 올려 주세요' : kind === 'script' ? '대본 파일을 올려 주세요' : '발표자료를 여기로 가져오세요'}</strong><span className="upload-desktop">파일을 끌어다 놓거나 <b>컴퓨터에서 선택</b></span><span className="upload-mobile"><b>기기에서 파일 선택</b></span><small>{formats} · 최대 30MB</small></button>}{error && <p role="alert" className="field-error"><Icon name="alert" size={14} />{error}</p>}</div>
}

export function Modal({ children, onClose, title, className = '' }) {
  const dialog = useRef(null)
  useEffect(() => {
    const current = dialog.current
    current.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function cancel(e) { e.preventDefault(); onClose() }
    current.addEventListener('cancel', cancel)
    return () => { current.removeEventListener('cancel', cancel); current.close(); document.body.style.overflow = previousOverflow }
  }, [onClose])
  return <dialog ref={dialog} className={`modal ${className}`} aria-label={title} onClick={e => { if (e.target === dialog.current) onClose() }}><button onClick={onClose} className="icon-button modal-close" aria-label="닫기"><Icon name="close" /></button>{children}</dialog>
}
