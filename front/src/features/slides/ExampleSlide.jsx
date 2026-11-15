import SlideImage from './SlideImage.jsx'

// 예시 발표자료(그린 호라이즌)의 원본 슬라이드 이미지를 그대로 보여 줍니다.
// 원본 크기(1920x1080)를 알려 줘 이미지를 불러오기 전에도 16:9 자리를 잡아요.
export default function ExampleSlide({ slide, small = false }) {
  return (
    <SlideImage
      src={slide.image}
      title={`${slide.id}번 예시 슬라이드: ${slide.title}`}
      small={small}
      width={1920}
      height={1080}
    />
  )
}
