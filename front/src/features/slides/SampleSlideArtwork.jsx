// 홈 쇼케이스와 예시 요약에 쓰는 예시 발표자료 썸네일입니다.
// 옆에 제목이 함께 보이는 곳에서는 decorative로 대체 텍스트를 비워 같은 제목을 두 번 읽지 않게 해요.
export default function SampleSlideArtwork({ slide, small = false, decorative = false }) {
  return (
    <div className={`slide-art ${small ? 'small' : ''}`}>
      <img
        src={slide.image}
        alt={decorative ? '' : `${slide.id}번 예시 슬라이드: ${slide.title}`}
        width={1920}
        height={1080}
        loading={small ? 'lazy' : 'eager'}
        decoding="async"
      />
    </div>
  )
}
