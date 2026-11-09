import GetStartedSection from '../features/home/GetStartedSection.jsx'
import FrequentlyAskedQuestions from '../features/home/FrequentlyAskedQuestions.jsx'
import HowItWorks from '../features/home/HowItWorks.jsx'
import FeatureSection from '../features/home/FeatureSection.jsx'
import SupportedFormats from '../features/home/SupportedFormats.jsx'
import HeroSection from '../features/home/HeroSection.jsx'
import FeedbackShowcase from '../features/home/FeedbackShowcase.jsx'
import '../styles/home-scroll.css'

export default function HomePage({ navigate, startExample }) {
  return (
    <div className="home-page">
      <HeroSection navigate={navigate} startExample={startExample} />
      <div className="home-showcase">
        <div className="section-wrap">
          <FeedbackShowcase startExample={startExample} />
        </div>
        <SupportedFormats />
      </div>
      <FeatureSection />
      <HowItWorks />
      <FrequentlyAskedQuestions />
      <GetStartedSection navigate={navigate} />
    </div>
  )
}
