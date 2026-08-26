import Hero from '../components/home/Hero';
import Manifesto from '../components/home/Manifesto';
import CultosSection from '../components/home/CultosSection';
import DnaSection from '../components/home/DnaSection';
import VerseSection from '../components/home/VerseSection';
import NovaCasaTeaser from '../components/home/NovaCasaTeaser';
import VisitBand from '../components/home/VisitBand';

export default function Home() {
  return (
    <>
      <Hero />
      <Manifesto />
      <CultosSection />
      <DnaSection />
      <VerseSection />
      <NovaCasaTeaser />
      <VisitBand />
    </>
  );
}
