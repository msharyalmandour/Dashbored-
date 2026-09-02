import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import IdentifyPanel from "@/components/IdentifyPanel";
import BrandOrigins from "@/components/BrandOrigins";
import PartsExplorer from "@/components/PartsExplorer";
import CollectionTeaser from "@/components/CollectionTeaser";
import AboutFooter from "@/components/AboutFooter";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <IdentifyPanel />
        <BrandOrigins />
        <PartsExplorer />
        <CollectionTeaser />
      </main>
      <AboutFooter />
    </>
  );
}
