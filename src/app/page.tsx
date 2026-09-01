import { Hero } from "@/components/home/Hero";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { Categories } from "@/components/home/Categories";
import { BrandStory } from "@/components/home/BrandStory";
import { Testimonials } from "@/components/home/Testimonials";
import { Newsletter } from "@/components/home/Newsletter";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedProducts />
      <Categories />
      <BrandStory />
      <Testimonials />
      <Newsletter />
    </>
  );
}
