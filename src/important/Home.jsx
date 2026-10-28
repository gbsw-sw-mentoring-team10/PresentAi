import { Button, Icon, SlideArtwork } from '../jjabary/components.jsx'
import { slides } from '../jjabary/data.js'

export default function Home({ navigate, startExample }) {
  return (
    <>
      <section className="hero section-wrap">
        <div className="eyebrow">
          <span className="status-dot" />
          YOUR NEXT PRESENTATION, BETTER.
        </div>
        <h1>
          전하고 싶은 생각,
          <br />
          <span className="highlight-text">확신 있는 발표로.</span>
          <span className="hero-star" aria-hidden="true">
            ✳
          </span>
        </h1>
        <p className="hero-description">
          자료의 첫 장부터 발표의 마지막 한마디까지.
          <br />
          좋은 피드백으로, 당신의 다음 발표를 완성하세요.
        </p>
        <div className="hero-actions">
          <Button variant="yellow" onClick={() => navigate('/materials')}>
            내 발표자료 점검하기
          </Button>
          <button className="text-button" onClick={startExample}>
            <span className="play-circle">
              <Icon name="play" size={11} />
            </span>
            예시 결과 둘러보기
          </button>
        </div>
        <div className="hero-small">
          <span>
            <Icon name="check" size={14} />
            발표 목적에 맞춘 피드백
          </span>
          <span>
            <Icon name="check" size={14} />
            슬라이드별 구체적인 제안
          </span>
        </div>
        <div className="showcase" aria-label="발표 피드백 결과 예시">
          <div className="showcase-label">
            <span className="hand-arrow">↘</span>작은 수정이 만드는 큰 차이
          </div>
          <div className="showcase-left">
            <div className="mini-page-title">
              <span className="tiny-dot" />
              나의 발표자료<span>06 slides</span>
            </div>
            <div className="mini-slide-row">
              <b>01</b>
              <SlideArtwork slide={slides[0]} small />
            </div>
            <div className="mini-slide-row active">
              <b>02</b>
              <SlideArtwork slide={slides[1]} small />
            </div>
            <div className="mini-slide-row">
              <b>03</b>
              <SlideArtwork slide={slides[2]} small />
            </div>
          </div>
          <div className="showcase-main">
            <div className="preview-toolbar">
              <span>
                <Icon name="slides" size={14} />
                2026 하반기 서비스 로드맵
              </span>
              <span className="example-label">예시 자료</span>
            </div>
            <SlideArtwork slide={slides[0]} />
            <div className="preview-bottom">
              <span>
                <i className="status-dot" />
                발표 목적과 흐름을 함께 점검해요
              </span>
              <span>01 / 06</span>
            </div>
          </div>
          <div className="feedback-float">
            <div className="feedback-float-heading">
              <span className="sparkle-box">
                <Icon name="sparkle" size={19} />
              </span>
              <strong>더 좋아질 수 있어요</strong>
              <span className="float-number">01</span>
            </div>
            <p>
              핵심 메시지를 한 줄로
              <br />
              <b>더 선명하게 전달해 보세요.</b>
            </p>
            <div className="suggestion-mini">
              <span>이렇게 바꿔 보세요</span>“하반기, 우리가 함께 만들어 갈<br />세 가지 변화”
            </div>
            <button onClick={startExample}>
              전체 피드백 보기
              <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="time-float">
            <span>
              <Icon name="clock" size={19} />
            </span>
            <div>
              <small>발표 시간도 균형 있게</small>
              <b>슬라이드별 권장 시간</b>
            </div>
            <strong>01:30</strong>
          </div>
          <div className="showcase-sticker" aria-hidden="true">
            GOOD
            <br />
            TO BETTER<span>↗</span>
          </div>
        </div>
      </section>
      <div className="format-strip">
        <div className="section-wrap">
          <span>익숙한 자료 그대로, 더 나은 발표로.</span>
          <div>
            <b>
              <span className="format-icon ppt">P</span>PowerPoint
            </b>
            <b>
              <span className="format-icon pdf">P</span>PDF
            </b>
            <b>
              <span className="format-icon html">〈/〉</span>HTML
            </b>
            <b>
              <span className="format-icon txt">T</span>대본 TXT
            </b>
          </div>
        </div>
      </div>
      <section className="features section-wrap" id="features">
        <div className="section-heading">
          <div>
            <span className="section-kicker">MAKE YOUR POINT.</span>
            <h2>
              준비는 꼼꼼하게.
              <br />
              발표는 자신 있게.
            </h2>
          </div>
          <p>
            무엇을 고쳐야 할지 막막할 때,
            <br />
            다음 한 걸음을 알려 주는 피드백.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card material-card">
            <div className="feature-card-top">
              <span className="feature-icon">
                <Icon name="slides" size={27} />
              </span>
              <span className="tag tag-yellow">자료 피드백</span>
            </div>
            <h3>
              좋은 자료가
              <br />
              좋은 발표의 시작이니까.
            </h3>
            <p>
              발표 목적, 논리 흐름, 가독성을 한 번에.
              <br />
              슬라이드마다 필요한 변화를 확인하세요.
            </p>
            <ul>
              <li>
                <Icon name="check" size={16} />
                슬라이드별 가독성과 수정 제안
              </li>
              <li>
                <Icon name="check" size={16} />
                논리 흐름과 빠진 내용 점검
              </li>
              <li>
                <Icon name="check" size={16} />
                권장 발표 시간과 정보 확인
              </li>
            </ul>
            <Button onClick={() => navigate('/materials')}>발표자료 피드백 시작</Button>
            <div className="card-decoration" aria-hidden="true">
              <span>01</span>
              <i />
            </div>
          </article>
          <article className="feature-card speech-card">
            <div className="feature-card-top">
              <span className="feature-icon">
                <Icon name="mic" size={27} />
              </span>
              <span className="tag tag-outline">준비 중 · 미리보기</span>
            </div>
            <h3>
              써 내려간 문장이
              <br />잘 전달되는 말이 되도록.
            </h3>
            <p>
              대본과 리허설 음성을 나란히.
              <br />
              전달 방식을 돌아보는 새로운 연습.
            </p>
            <ul>
              <li>
                <Icon name="check" size={16} />
                대본과 실제 발화 비교
              </li>
              <li>
                <Icon name="check" size={16} />
                발음·전달 방식 피드백
              </li>
              <li>
                <Icon name="check" size={16} />
                다음 연습을 위한 개선 제안
              </li>
            </ul>
            <Button variant="yellow" onClick={() => navigate('/speech')}>
              발표 피드백 미리보기
            </Button>
            <div className="wave-decoration" aria-hidden="true">
              {[20, 36, 64, 94, 55, 76, 110, 73, 43, 64, 35, 18].map((h, i) => (
                <i style={{ height: h }} key={i} />
              ))}
            </div>
          </article>
        </div>
      </section>
      <section className="how-section" id="how">
        <div className="section-wrap">
          <div className="section-heading">
            <div>
              <span className="section-kicker">LESS GUESSWORK. MORE CONFIDENCE.</span>
              <h2>
                복잡한 준비는 덜고,
                <br />
                중요한 것에 집중하세요.
              </h2>
            </div>
            <Button variant="yellow" onClick={() => navigate('/materials')}>
              지금 시작하기
            </Button>
          </div>
          <div className="how-grid">
            {[
              {
                n: '01',
                icon: 'upload',
                title: '목적과 자료를 알려 주세요',
                text: '누구에게, 어떤 이야기를 전하나요? 발표 목적을 적고 준비한 자료를 올려 주세요.',
              },
              {
                n: '02',
                icon: 'sparkle',
                title: '발표를 함께 들여다봐요',
                text: '자료의 흐름과 내용, 전달력을 점검하고 필요한 피드백을 정리합니다.',
              },
              {
                n: '03',
                icon: 'check',
                title: '한 단계 더 나은 발표로',
                text: '우선 수정사항부터 하나씩. 슬라이드별 제안으로 발표의 완성도를 높이세요.',
              },
            ].map((item) => (
              <article key={item.n}>
                <div>
                  <span>{item.n}</span>
                  <Icon name={item.icon} size={25} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="faq-section section-wrap">
        <div>
          <span className="section-kicker">A LITTLE MORE CLARITY.</span>
          <h2>
            시작하기 전에
            <br />
            궁금한 것들.
          </h2>
        </div>
        <div className="faq-list">
          {[
            [
              '어떤 발표자료를 올릴 수 있나요?',
              'PPT, PPTX, PDF, HTML 파일을 선택할 수 있어요. 체험 화면의 파일 크기는 최대 30MB입니다. 대본은 TXT 파일로 올리거나 직접 입력할 수 있어요.',
            ],
            [
              '발표 목적은 어떻게 적으면 좋나요?',
              '청중, 전달하고 싶은 내용, 발표 시간을 함께 알려 주세요. 예를 들어 “신입 사원에게 하반기 로드맵을 10분 안에 소개”처럼 구체적으로 적으면 좋아요.',
            ],
            [
              '지금 실제 자료를 분석할 수 있나요?',
              '분석 시작 시 발표 정보·대본·선택한 발표자료를 분석 서버로 전송합니다. 서버가 반환한 점수와 피드백을 확인할 수 있어요. 예시 결과 둘러보기는 별도의 샘플 화면이며, 음성 피드백은 준비 중입니다.',
            ],
            [
              '음성 피드백도 사용할 수 있나요?',
              '음성 피드백은 준비 중인 기능으로, 입력과 결과 화면을 미리 볼 수 있어요. 대본 비교와 발음 분석의 실제 기준은 추후 확정됩니다.',
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Icon name="plus" size={20} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="final-cta section-wrap">
        <div>
          <span className="section-kicker">YOUR IDEAS DESERVE TO BE HEARD.</span>
          <h2>
            다음 발표는,
            <br />더 자신 있는 당신으로.
          </h2>
          <Button onClick={() => navigate('/materials')}>내 발표자료 점검하기</Button>
        </div>
        <div className="cta-mark" aria-hidden="true">
          ↗
          <span>
            make
            <br />
            your point.
          </span>
        </div>
      </section>
    </>
  )
}
