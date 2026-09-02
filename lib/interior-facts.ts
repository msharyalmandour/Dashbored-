import type { Car } from "./types";

export interface InteriorFact {
  label: string;
  value: string;
}

export function interiorFacts(car: Car): InteriorFact[] {
  const materials =
    car.category === "supercars" || car.category === "sports"
      ? "Carbon fibre trim and Alcantara throughout"
      : car.category === "luxury"
        ? "Hand-stitched leather and open-pore wood veneer"
        : car.category === "electric"
          ? "Low-impact, partly recycled cabin materials"
          : car.category === "suv"
            ? "Leather upholstery with brushed aluminum accents"
            : "Leather trim with heritage-inspired detailing";

  const technology =
    car.fuelType === "Electric"
      ? "Digital-first cockpit with over-the-air updates"
      : car.fuelType === "Hybrid"
        ? "Hybrid power management with adaptive displays"
        : "Driver-focused digital instrumentation";

  const comfort =
    car.category === "luxury" || car.category === "suv"
      ? "Adaptive air suspension and massaging seats"
      : "Sport seats bolstered for long, fast drives";

  const drivingPosition =
    car.category === "supercars"
      ? "Low, reclined, race-inspired seating"
      : car.category === "suv"
        ? "Elevated, commanding view of the road"
        : "Focused, driver-angled cockpit";

  return [
    { label: "Materials", value: materials },
    { label: "Technology", value: technology },
    { label: "Comfort", value: comfort },
    { label: "Driving Position", value: drivingPosition },
  ];
}
