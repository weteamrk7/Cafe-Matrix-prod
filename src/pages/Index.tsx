import Header from "@/components/Header";
import Hero from "@/components/Hero";
import DicePromo from "@/components/DicePromo";
import About from "@/components/About";
import Menu from "@/components/Menu";
import Gallery from "@/components/Gallery";
import Services from "@/components/Services";
import Testimonials from "@/components/Testimonials";
import Visit from "@/components/Visit";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="overflow-x-hidden">
      <Header />
      <Hero />
      <DicePromo />
      <About />
      <Menu />
      <Gallery />
      <Services />
      <Testimonials />
      <Visit />
      <Footer />
    </main>
  );
};

export default Index;
