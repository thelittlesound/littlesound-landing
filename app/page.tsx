import Hero from './components/Hero';
import Problem from './components/Problem';
import Solution from './components/Solution';
import Founders from './components/Founders';
import Categories from './components/Categories';
import Providers from './components/Providers';
import CTA from './components/CTA';
import Footer from './components/Footer';

export default function Home() {
  return (
    <main>
      <Hero />
      <Problem />
      <Solution />
      <Founders />
      <Categories />
      <Providers />
      <CTA />
      <Footer />
    </main>
  );
}
