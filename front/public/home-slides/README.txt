메인 화면에 직접 만든 PPT 넣기

1. PPT를 16:9 크기로 만들고, 슬라이드마다 PNG 또는 JPG 이미지로 내보냅니다.
2. 이미지 파일을 이 폴더에 넣습니다. 예: 01.png, 02.png, 03.png
3. src/features/home/homeSlides.js의 homeSlides 배열을 아래처럼 바꿉니다.

export const homeSlides = [
  { id: 'my-slide-1', title: '첫 번째 슬라이드 내용', image: '/home-slides/01.png' },
  { id: 'my-slide-2', title: '두 번째 슬라이드 내용', image: '/home-slides/02.png' },
]

title은 스크린리더와 슬라이드 선택 버튼에 사용하는 설명입니다.
슬라이드 개수는 자유롭게 늘리거나 줄일 수 있습니다. 한 장이면 자동 재생은 하지 않습니다.
기존 텍스트 슬라이드와 이미지 슬라이드를 섞어 쓸 수도 있습니다.
프레임, 3초 자동 전환, 반복 재생은 변경할 필요가 없습니다.
이미지는 비율을 유지해 전체가 보이도록 표시합니다. 16:9를 권장합니다.
.ppt 또는 .pptx 파일 자체를 브라우저에서 재생하는 기능은 아닙니다.
