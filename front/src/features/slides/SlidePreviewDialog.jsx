import { useState } from 'react'
import Modal from '../../components/ui/Modal.jsx'

import SlidePreview from './SlidePreview.jsx'

export default function SlidePreviewDialog({ slide, pdf, closePreview }) {
  const [zoom, setZoom] = useState(100)
  const pad = (value) => String(value).padStart(2, '0')
  return (
    <Modal
      className="deck-preview-modal"
      title={`${slide.id}번 슬라이드 크게 보기`}
      onClose={closePreview}
    >
      <div className="deck-modal-heading">
        <div>
          <span>SLIDE {pad(slide.id)}</span>
          <h2>{slide.title}</h2>
        </div>
        <div className="deck-zoom">
          <button
            aria-label="축소"
            disabled={zoom <= 100}
            onClick={() => setZoom((value) => value - 25)}
          >
            −
          </button>
          <span>{zoom}%</span>
          <button
            aria-label="확대"
            disabled={zoom >= 200}
            onClick={() => setZoom((value) => value + 25)}
          >
            +
          </button>
        </div>
      </div>
      <div className="deck-modal-canvas">
        <div style={{ width: `${zoom}%`, maxWidth: `${zoom * 1.1}dvh` }}>
          <SlidePreview slide={slide} pdf={pdf} expanded />
        </div>
      </div>
      <p className="deck-modal-hint">
        {slide.example ? '설명용 예시 슬라이드입니다.' : '업로드한 자료의 원본입니다.'} · Esc 키로
        닫을 수 있어요.
      </p>
    </Modal>
  )
}
