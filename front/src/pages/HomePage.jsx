import GetStartedSection from '../features/home/GetStartedSection.jsx'
import FrequentlyAskedQuestions from '../features/home/FrequentlyAskedQuestions.jsx'
import HowItWorks from '../features/home/HowItWorks.jsx'
import FeatureSection from '../features/home/FeatureSection.jsx'
import HeroSection from '../features/home/HeroSection.jsx'
import '../styles/home-scroll.css'

export default function HomePage({ navigate }) {
  return (
    <div className="home-page">
      <HeroSection onStart={() => navigate('/materials')} />
      <FeatureSection />
      <HowItWorks />
      <FrequentlyAskedQuestions />
      <GetStartedSection navigate={navigate} />
    </div>
  )
}
