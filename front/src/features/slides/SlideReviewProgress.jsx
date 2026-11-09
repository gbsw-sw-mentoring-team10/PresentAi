import Icon from '../../components/ui/Icon.jsx'

export default function SlideReviewProgress({ reviewedCount, totalCount }) {
  return (
    <div className="deck-workspace-heading">
      <div>
        <span className="deck-eyebrow">ONE SLIDE. ONE STEP FORWARD.</span>
        <h2>한 장씩, 더 선명하게.</h2>
        <p>원본과 피드백을 함께 보며 발표를 다듬어 보세요.</p>
      </div>
      <div className="deck-progress">
        <span>
          <Icon name="check" size={15} />
          피드백 확인{' '}
          <b>
            {reviewedCount}
            <span> / {totalCount}</span>
          </b>
        </span>
        <div
          role="progressbar"
          aria-label="피드백 확인 진행률"
          aria-valuemin={0}
          aria-valuemax={totalCount || 1}
          aria-valuenow={reviewedCount}
        >
          <i
            style={{
              width: `${totalCount ? (reviewedCount / totalCount) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
