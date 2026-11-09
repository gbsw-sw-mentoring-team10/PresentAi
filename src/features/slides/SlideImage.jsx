import { useState } from 'react'
import Icon from '../../components/ui/Icon.jsx'

export default function SlideImage({ src, title }) {
  const [failed, setFailed] = useState(false)
  return failed ? (
    <div className="deck-preview-missing">
      <Icon name="file" />
      <p>원본 이미지를 불러올 수 없어요.</p>
    </div>
  ) : (
    <img
      className="deck-original-image"
      src={src}
      alt={title}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  )
}
