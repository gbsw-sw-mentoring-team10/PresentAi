import Icon from '../../components/ui/Icon.jsx'
import ExampleSlide from './ExampleSlide.jsx'

import PdfPageCanvas from './PdfPageCanvas.jsx'
import SlideImage from './SlideImage.jsx'

export default function SlidePreview({ slide, pdf, small = false, expanded = false }) {
  if (slide.example) return <ExampleSlide slide={slide} />
  if (pdf && slide.id <= pdf.numPages)
    return (
      <PdfPageCanvas
        key={`${slide.id}-${expanded}`}
        document={pdf}
        pageNumber={slide.id}
        small={small}
        expanded={expanded}
      />
    )
  if (slide.imageUrl)
    return (
      <SlideImage key={slide.imageUrl} src={slide.imageUrl} title={`${slide.id}번 원본 슬라이드`} />
    )
  return (
    <div className="deck-preview-missing">
      <Icon name="file" size={small ? 22 : 32} />
      {!small && (
        <>
          <strong>원본 미리보기가 없어요</strong>
          <p>
            PDF 자료는 원본을 바로 볼 수 있어요.
            <br />이 자료의 피드백은 오른쪽에서 확인해 주세요.
          </p>
        </>
      )}
    </div>
  )
}
