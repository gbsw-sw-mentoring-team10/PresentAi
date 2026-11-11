import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { describeDate } from './accountRecord.js'

export default function ProfilePanel({ email, profile, loading, onOpen }) {
  return (
    <div className="mypage-grid">
      <section className="mypage-card" aria-labelledby="mypage-account-title">
        <div className="card-label">
          <Icon name="user" size={18} />
          <h2 id="mypage-account-title">계정 정보</h2>
        </div>
        <dl className="mypage-info">
          <div className="mypage-info-row">
            <dt>이메일</dt>
            <dd>
              <strong className="mypage-email">{email}</strong>
              <small>마지막 변경: {describeDate(profile?.emailUpdatedAt, loading)}</small>
              <small>따로 아이디가 없어서 이메일이 이름으로 쓰여요.</small>
            </dd>
            <dd className="mypage-info-action">
              <Button
                variant="outline"
                icon="edit"
                className="mypage-action"
                onClick={() => onOpen('email')}
              >
                이메일 변경
              </Button>
            </dd>
          </div>
          <div className="mypage-info-row">
            <dt>비밀번호</dt>
            <dd>
              <strong>
                <span aria-hidden="true">••••••••</span>
                <span className="sr-only">보안을 위해 가려 두었어요</span>
              </strong>
              <small>마지막 변경: {describeDate(profile?.passwordUpdatedAt, loading)}</small>
            </dd>
            <dd className="mypage-info-action">
              <Button
                variant="outline"
                icon="edit"
                className="mypage-action"
                onClick={() => onOpen('password')}
              >
                비밀번호 변경
              </Button>
            </dd>
          </div>
          <div className="mypage-info-row">
            <dt>가입일</dt>
            <dd>
              <strong>{describeDate(profile?.createdAt, loading, '정보 없음')}</strong>
            </dd>
          </div>
        </dl>
      </section>
      <section className="mypage-card mypage-danger" aria-labelledby="mypage-delete-title">
        <div className="card-label">
          <Icon name="alert" size={18} />
          <h2 id="mypage-delete-title">계정 탈퇴</h2>
        </div>
        <p>
          탈퇴하면 지금까지 받은 피드백 기록과 계정 정보가 모두 삭제되고, 다시 되돌릴 수 없어요.
        </p>
        <Button
          variant="outline"
          icon={null}
          className="mypage-action mypage-delete-button"
          onClick={() => onOpen('delete')}
        >
          계정 탈퇴
        </Button>
      </section>
    </div>
  )
}
