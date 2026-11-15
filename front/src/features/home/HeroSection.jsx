import FeedbackShowcase from './FeedbackShowcase.jsx'

export default function HeroSection({ onStart }) {
  return (
    <section className="home-intro section-wrap">
      <h1 className="sr-only">전하고 싶은 생각, 확신 있는 발표로.</h1>
      <FeedbackShowcase onStart={onStart} />
    </section>
  )
}
