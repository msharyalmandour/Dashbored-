import { PlatformProvider } from "@/components/platform/PlatformContext";
import Nav from "@/components/platform/Nav";
import Hero from "@/components/platform/Hero";
import Discover from "@/components/platform/Discover";
import Brands from "@/components/platform/Brands";
import FeaturedCars from "@/components/platform/FeaturedCars";
import Categories from "@/components/platform/Categories";
import PersonalityQuiz from "@/components/platform/PersonalityQuiz";
import Compare from "@/components/platform/Compare";
import FeelingDiscovery from "@/components/platform/FeelingDiscovery";
import Stories from "@/components/platform/Stories";
import Footer from "@/components/platform/Footer";
import CarDetailOverlay from "@/components/platform/CarDetailOverlay";

export default function Home() {
  return (
    <PlatformProvider>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Discover />
        <Brands />
        <FeaturedCars />
        <Categories />
        <PersonalityQuiz />
        <Compare />
        <FeelingDiscovery />
        <Stories />
      </main>
      <Footer />
      <CarDetailOverlay />
    </PlatformProvider>
  );
}
