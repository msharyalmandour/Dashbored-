import { PlatformProvider } from "@/components/catalog/PlatformContext";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import VehicleSelector from "@/components/catalog/VehicleSelector";
import CategoryGrid from "@/components/catalog/CategoryGrid";
import BrandExplorer from "@/components/catalog/BrandExplorer";
import ProductGrid from "@/components/catalog/ProductGrid";
import AboutFooter from "@/components/AboutFooter";
import PartDetailOverlay from "@/components/catalog/PartDetailOverlay";
import { FavoritesPanel, CartDrawer } from "@/components/catalog/SidePanels";

export default function Home() {
  return (
    <PlatformProvider>
      <Nav />
      <main className="flex-1">
        <Hero />
        <VehicleSelector />
        <CategoryGrid />
        <BrandExplorer />
        <ProductGrid />
      </main>
      <AboutFooter />
      <PartDetailOverlay />
      <FavoritesPanel />
      <CartDrawer />
    </PlatformProvider>
  );
}
